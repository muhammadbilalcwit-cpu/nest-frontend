import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  User,
  Company,
  Department,
  ActivityLog,
  PaginatedData,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Custom event for force logout (used when token refresh fails due to inactive user)
export const FORCE_LOGOUT_EVENT = "force-logout";

export const FORBIDDEN_EVENT = "forbidden-access";

export const triggerForceLogout = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FORCE_LOGOUT_EVENT));
  }
};

export const triggerForbidden = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT));
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: This sends cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor with silent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ✅ HANDLE 403 FIRST
    if (error.response?.status === 403) {
      triggerForbidden();
      return Promise.reject(error);
    }

    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Skip refresh for these endpoints to avoid infinite loops
    const skipRefreshUrls = ["/auth/login", "/auth/refresh", "/auth/logout"];
    if (skipRefreshUrls.some((url) => originalRequest?.url?.includes(url))) {
      return Promise.reject(error);
    }

    // Don't retry if already retried
    if (originalRequest._retry) {
      // Refresh failed, trigger force logout to clear cookies and redirect
      triggerForceLogout();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt to refresh the token
      await api.post("/auth/refresh");

      // Token refreshed successfully, process queued requests
      processQueue(null);

      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed, process queue with error
      processQueue(refreshError as Error);

      // Trigger force logout to clear cookies and redirect
      triggerForceLogout();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ accessToken: string; user: User }>>("/auth/login", {
      email,
      password,
    }),

  logout: () => api.post("/auth/logout"),

  getProfile: () => api.get<ApiResponse<User>>("/users/profile"),

  refreshToken: () => api.post("/auth/refresh"),
};

// Users endpoints
export const usersApi = {
  getAll: (includeInactive = false) =>
    api.get<ApiResponse<User[]>>(
      `/users/getAll${includeInactive ? "?includeInactive=true" : ""}`,
    ),

  getById: (id: number) => api.get<ApiResponse<User>>(`/users/getById/${id}`),

  getByEmail: (email: string) =>
    api.get<ApiResponse<User>>(`/users/getByEmail/${email}`),

  create: (
    data: Partial<User> & {
      password: string;
      departmentId?: number;
      companyId?: number;
      roleSlug?: string;
    },
  ) => api.post<ApiResponse<User>>("/users/create", data),

  update: (id: number, data: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/update/${id}`, data),

  // Self-update profile - for any authenticated user to update their own profile
  updateProfile: (data: {
    firstname?: string;
    lastname?: string;
    password?: string;
    currentPassword?: string;
  }) => api.put<ApiResponse<User>>("/users/profile", data),

  delete: (id: number) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/users/delete/${id}`),

  assignRoles: (id: number, roleSlugs: string[]) =>
    api.post<ApiResponse<User>>(`/users/${id}/assignRoles`, { roleSlugs }),

  removeRole: (id: number, slug: string) =>
    api.delete<ApiResponse<User>>(`/users/${id}/removeRoles/${slug}`),

  updateStatus: (id: number, isActive: boolean) =>
    api.patch<ApiResponse<User>>(`/users/${id}/status`, { isActive }),
};

// Companies endpoints
export const companiesApi = {
  getAll: () => api.get<ApiResponse<Company[]>>("/companies/getAll"),

  getById: (id: number) =>
    api.get<ApiResponse<Company>>(`/companies/getById/${id}`),

  create: (data: Partial<Company>) =>
    api.post<ApiResponse<Company>>("/companies/create", data),

  update: (id: number, data: Partial<Company>) =>
    api.put<ApiResponse<Company>>(`/companies/update/${id}`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/companies/delete/${id}`),
};

// Departments endpoints
export const departmentsApi = {
  getAll: () => api.get<ApiResponse<Department[]>>("/departments/getAll"),

  getById: (id: number) =>
    api.get<ApiResponse<Department>>(`/departments/getById/${id}`),

  getByCompany: (companyId: number) =>
    api.get<ApiResponse<Department[]>>(
      `/departments/getByCompany/${companyId}`,
    ),

  create: (data: Partial<Department> & { companyId: number }) =>
    api.post<ApiResponse<Department>>("/departments/create", data),

  update: (id: number, data: Partial<Department>) =>
    api.put<ApiResponse<Department>>(`/departments/update/${id}`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/departments/delete/${id}`),
};

// Roles endpoints
export const rolesApi = {
  getAll: () =>
    api.get<ApiResponse<{ id: number; name: string; slug: string }[]>>(
      "/roles/getAll",
    ),
};

// Activity logs endpoints (for company_admin)
export const activityLogsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    method?: string;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.method) queryParams.append("method", params.method);
    if (params?.search) queryParams.append("search", params.search);
    const queryString = queryParams.toString();
    return api.get<ApiResponse<PaginatedData<ActivityLog>>>(
      `/activity-logs/getAll${queryString ? `?${queryString}` : ""}`,
    );
  },

  getByUserId: (userId: number) =>
    api.get<ApiResponse<ActivityLog[]>>(`/activity-logs/user/${userId}`),
};

export default api;
