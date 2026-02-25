'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import type { RoleSlug } from '@/types';
import {
  Building2,
  LayoutDashboard,
  Users,
  Building,
  FolderTree,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  Shield,
  Wifi,
  Eye,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  visible?: boolean;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const hasRole = useAuthStore((s) => s.hasRole);
  const logout = useAuthStore((s) => s.logout);
  const primaryRole = useAuthStore((s) => s.primaryRole);
  const hasCompliancePolicy = useAuthStore((s) => s.hasCompliancePolicy);

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: '/dashboard/companies',
      label: 'Companies',
      icon: <Building className="w-5 h-5" />,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/departments',
      label: 'Departments',
      icon: <FolderTree className="w-5 h-5" />,
      roles: ['super_admin', 'company_admin'],
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="w-5 h-5" />,
      roles: ['super_admin', 'company_admin', 'manager'],
    },
    {
      href: '/dashboard/roles',
      label: 'Roles',
      icon: <Shield className="w-5 h-5" />,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/active-sessions',
      label: 'Active Sessions',
      icon: <Wifi className="w-5 h-5" />,
      roles: ['super_admin', 'company_admin'],
    },
    {
      href: '/dashboard/activity-logs',
      label: 'Activity Logs',
      icon: <ScrollText className="w-5 h-5" />,
      roles: ['super_admin', 'company_admin'],
    },
    // Support page hidden — replaced by Support tab in Messages sidebar
    // {
    //   href: '/dashboard/support',
    //   label: 'Support',
    //   icon: <Headset className="w-5 h-5" />,
    //   roles: ['super_admin', 'company_admin', 'manager', 'user']
    // },
    {
      href: '/dashboard/compliance',
      label: 'Compliance',
      icon: <Eye className="w-5 h-5" />,
      visible: hasCompliancePolicy,
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      // No roles specified = visible to all authenticated users
    },
  ];

  const isCustomer = primaryRole === 'customer';

  const filteredNavItems = navItems.filter((item) => {
    if (item.visible === false) return false;
    // Customers only see Settings (chat is accessed via the Messages sidebar)
    if (isCustomer) return item.href === '/dashboard/settings';
    if (!item.roles) return true;
    return item.roles.some((role) => hasRole(role as RoleSlug));
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-dark-border">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-primary-600 rounded-lg flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-slate-900 dark:text-white truncate">
              CMS
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft
            className={clsx(
              'w-5 h-5 text-slate-500 transition-transform',
              isCollapsed && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'sidebar-link',
              isActive(item.href) && 'active',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-slate-200 dark:border-dark-border">
        {/* Role badge */}
        {!isCollapsed && primaryRole && (
          <div className="mb-3 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="text-xs text-slate-500 dark:text-dark-muted">Role</div>
            <div className="text-sm font-medium text-slate-700 dark:text-dark-text capitalize">
              {primaryRole.replace('_', ' ')}
            </div>
          </div>
        )}

        <button
          onClick={() => logout()}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
