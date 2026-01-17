# Nest Frontend

A modern, responsive admin dashboard built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. Features role-based access control, real-time notifications, and dark mode support.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.21 | React framework with App Router |
| React | 18.3.1 | UI library |
| TypeScript | 5.6.3 | Type safety |
| Tailwind CSS | 3.4.15 | Styling |
| Axios | 1.7.7 | HTTP client |
| Socket.IO Client | 4.7.5 | Real-time notifications |
| Lucide React | 0.460.0 | Icons |

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page (redirects to login)
│   ├── globals.css               # Global styles
│   ├── login/
│   │   └── page.tsx              # Login page
│   └── dashboard/
│       ├── page.tsx              # Dashboard home
│       ├── users/
│       │   └── page.tsx          # User management
│       ├── companies/
│       │   └── page.tsx          # Company management
│       ├── departments/
│       │   └── page.tsx          # Department management
│       ├── roles/
│       │   └── page.tsx          # Roles listing
│       ├── activity-logs/
│       │   └── page.tsx          # Activity logs with pagination
│       └── settings/
│           └── page.tsx          # User settings/profile
│
├── components/
│   ├── layout/
│   │   ├── index.ts              # Layout exports
│   │   ├── DashboardLayout.tsx   # Main dashboard wrapper
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   └── Header.tsx            # Top navigation with theme toggle
│   └── ui/
│       ├── index.ts              # UI component exports
│       ├── Table.tsx             # Reusable data table
│       ├── Modal.tsx             # Modal dialog
│       └── ConfirmDialog.tsx     # Confirmation dialog
│
├── context/
│   ├── AuthContext.tsx           # Authentication state
│   ├── ThemeContext.tsx          # Dark/Light mode
│   └── NotificationContext.tsx   # Real-time notifications
│
├── services/
│   └── api.ts                    # Axios instance & API functions
│
├── hooks/
│   └── (custom hooks)            # Reusable hooks
│
└── types/
    └── index.ts                  # TypeScript interfaces
```

## Features

### Authentication
- Cookie-based JWT authentication
- Automatic token refresh
- Protected routes with role-based access
- Login/Logout functionality

### Role-Based Access Control (RBAC)
Four-tier role hierarchy:
- **super_admin**: Full system access
- **company_admin**: Company-scoped management
- **manager**: Department-scoped access
- **user**: Basic access

### Dark Mode
- Toggle between light/dark themes
- Persists preference to localStorage
- Follows system preference by default
- Toggle button in header

### Real-Time Notifications
- WebSocket connection via Socket.IO
- Company-scoped notifications
- Live updates for CRUD operations
- Toast notifications

### Pages

| Page | Route | Access |
|------|-------|--------|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All authenticated |
| Users | `/dashboard/users` | super_admin, company_admin, manager |
| Companies | `/dashboard/companies` | super_admin, company_admin |
| Departments | `/dashboard/departments` | All authenticated |
| Roles | `/dashboard/roles` | All authenticated |
| Activity Logs | `/dashboard/activity-logs` | super_admin, company_admin |
| Settings | `/dashboard/settings` | All authenticated |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API running (NestJS)

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project
cd nest-frontend

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Development

```bash
# Start development server (port 3000)
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Linting

```bash
npm run lint
```

## API Integration

All API calls are centralized in `src/services/api.ts`:

```typescript
// API client with interceptors
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,  // Send cookies
});

// Automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic
    }
  }
);
```

### Available API Functions

```typescript
// Auth
authApi.login(email, password)
authApi.logout()
authApi.refresh()

// Users
usersApi.getAll()
usersApi.getById(id)
usersApi.create(data)
usersApi.update(id, data)
usersApi.delete(id)
usersApi.assignRoles(id, roleSlugs)
usersApi.removeRole(id, slug)

// Companies
companiesApi.getAll()
companiesApi.getById(id)
companiesApi.create(data)
companiesApi.update(id, data)
companiesApi.delete(id)

// Departments
departmentsApi.getAll()
departmentsApi.getById(id)
departmentsApi.create(data)
departmentsApi.update(id, data)
departmentsApi.delete(id)

// Roles
rolesApi.getAll()

// Activity Logs
activityLogsApi.getAll({ page, limit, method, search })
```

## Context Providers

### AuthContext
```typescript
const { user, isAuthenticated, isLoading, login, logout, hasRole } = useAuth();

// Check role
if (hasRole('super_admin')) { ... }
if (hasRole(['super_admin', 'company_admin'])) { ... }
```

### ThemeContext
```typescript
const { theme, toggleTheme, setTheme } = useTheme();

// Toggle
<button onClick={toggleTheme}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</button>

// Set specific theme
setTheme('dark');
setTheme('light');
```

### NotificationContext
```typescript
const { notifications, unreadCount, markAsRead } = useNotifications();
```

## TypeScript Types

```typescript
// User
interface User {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  role?: Role;
  roles?: Role[];
  department?: Department;
  company?: Company;
}

// Role
interface Role {
  id: number;
  name: string;
  slug: string;
}

// Company
interface Company {
  id: number;
  name: string;
  address?: string;
}

// Department
interface Department {
  id: number;
  name: string;
  company?: Company;
}

// API Response
interface ApiResponse<T> {
  message: string;
  status_code: number;
  data: T;
}

// Paginated Response
interface PaginatedData<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

## Styling

Uses Tailwind CSS with custom configuration:

```typescript
// tailwind.config.ts
{
  darkMode: 'class',  // Class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: { ... },  // Blue color palette
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#e2e8f0',
          muted: '#94a3b8',
        }
      }
    }
  }
}
```

### Dark Mode Classes
```tsx
// Pattern: light-style dark:dark-style
<div className="bg-white dark:bg-slate-800">
<p className="text-slate-900 dark:text-white">
<button className="bg-primary-600 dark:bg-primary-500">
```

## Component Usage

### Table
```tsx
<Table
  columns={[
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name' },
    { key: 'actions', header: 'Actions', render: (row) => <button>Edit</button> }
  ]}
  data={users}
  keyExtractor={(user) => user.id}
  isLoading={isLoading}
  emptyMessage="No users found"
/>
```

### Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit User"
>
  <form>...</form>
</Modal>
```

### ConfirmDialog
```tsx
<ConfirmDialog
  isOpen={isDeleteOpen}
  onClose={() => setIsDeleteOpen(false)}
  onConfirm={handleDelete}
  title="Delete User"
  message="Are you sure you want to delete this user?"
  confirmText="Delete"
  isDestructive
  isLoading={isDeleting}
/>
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Related

- [Backend Documentation](../nest-postgres-db-first-cookie-based/DOCUMENTATION.md) - NestJS backend API documentation