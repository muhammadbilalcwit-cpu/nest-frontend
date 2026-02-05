import { AxiosError } from 'axios';

// API error response format (consistent with backend ApiResponse)
interface ApiErrorResponse {
  message?: string | string[];
  status_code?: number;
  data?: unknown;
}

// Extracts a user-friendly error message from an axios error response
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  // Handle AxiosError
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const data = axiosError.response?.data;

    if (data?.message) {
      // Handle message as string
      if (typeof data.message === 'string') {
        return data.message;
      }
      // Handle message as array (validation errors)
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
    }

    // Fallback to axios error message
    if (axiosError.message) {
      return axiosError.message;
    }
  }

  // Handle standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string error
  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}
