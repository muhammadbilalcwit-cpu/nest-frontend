'use client';

import Link from 'next/link';
import { DashboardLayout } from '@/components/layout';
import { StatsCard, PageHeader, EmptyState, QuickActionCard } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanies, useDepartments, useUsers } from '@/hooks/queries';
import { Building, FolderTree, Users, Activity } from 'lucide-react';

export default function DashboardPage() {
  const primaryRole = useAuthStore((s) => s.primaryRole);
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = primaryRole === 'super_admin';
  const isCompanyAdmin = primaryRole === 'company_admin';
  const isManager = primaryRole === 'manager';

  // Fetch data based on role
  const { data: companies = [] } = useCompanies(isSuperAdmin);
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: users = [], isLoading: usersLoading } = useUsers();

  const isLoading = deptsLoading || usersLoading;

  const stats = {
    companies: isSuperAdmin ? companies.length : (isCompanyAdmin || isManager ? 1 : 0),
    departments: isSuperAdmin || isCompanyAdmin || isManager ? departments.length : 0,
    users: isSuperAdmin || isCompanyAdmin || isManager ? users.length : 0,
  };

  const getWelcomeMessage = () => {
    const name = user?.firstname || user?.email?.split('@')[0] || 'User';
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17) greeting = 'Good evening';
    return `${greeting}, ${name}!`;
  };

  const getRoleSpecificContent = () => {
    switch (primaryRole) {
      case 'super_admin':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard
                title="Total Companies"
                value={isLoading ? '-' : stats.companies}
                icon={<Building className="w-6 h-6" />}
                color="primary"
              />
              <StatsCard
                title="Total Departments"
                value={isLoading ? '-' : stats.departments}
                icon={<FolderTree className="w-6 h-6" />}
                color="success"
              />
              <StatsCard
                title="Total Users"
                value={isLoading ? '-' : stats.users}
                icon={<Users className="w-6 h-6" />}
                color="warning"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <QuickActionCard href="/dashboard/companies" icon={<Building className="w-5 h-5 text-primary-600" />} label="Manage Companies" />
                  <QuickActionCard href="/dashboard/departments" icon={<FolderTree className="w-5 h-5 text-green-600" />} label="Manage Departments" />
                  <QuickActionCard href="/dashboard/users" icon={<Users className="w-5 h-5 text-amber-600" />} label="Manage Users" />
                </div>
              </div>

              {/* <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  System Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-dark-muted">System Status</span>
                    <span className="badge badge-success">Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-dark-muted">Redis Cache</span>
                    <span className="badge badge-success">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-dark-muted">WebSocket</span>
                    <span className="badge badge-success">Active</span>
                  </div>
                </div>
              </div> */}
            </div>
          </>
        );

      case 'company_admin':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <StatsCard
                title="Departments"
                value={isLoading ? '-' : stats.departments}
                icon={<FolderTree className="w-6 h-6" />}
                color="primary"
              />
              <StatsCard
                title="Team Members"
                value={isLoading ? '-' : stats.users}
                icon={<Users className="w-6 h-6" />}
                color="success"
              />
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <QuickActionCard href="/dashboard/departments" icon={<FolderTree className="w-5 h-5 text-primary-600" />} label="Manage Departments" />
                <QuickActionCard href="/dashboard/users" icon={<Users className="w-5 h-5 text-green-600" />} label="Manage Users" />
                <QuickActionCard href="/dashboard/activity-logs" icon={<Activity className="w-5 h-5 text-amber-600" />} label="View Activity Logs" />
              </div>
            </div>
          </>
        );

      case 'manager':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <StatsCard
                title="Team Members"
                value={isLoading ? '-' : stats.users}
                icon={<Users className="w-6 h-6" />}
                color="primary"
              />
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Team Management
              </h3>
              <QuickActionCard href="/dashboard/users" icon={<Users className="w-5 h-5 text-primary-600" />} label="View Team Members" />
            </div>
          </>
        );

      default:
        return (
          <EmptyState
            icon={<Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />}
            title="Welcome to Enterprise MS"
            message="Manage your profile and preferences from the settings page."
            action={
              <Link href="/dashboard/settings" className="btn-primary inline-block">
                Go to Settings
              </Link>
            }
          />
        );
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <PageHeader
        title={getWelcomeMessage()}
        subtitle="Here's what's happening in your organization today."
      />

      {getRoleSpecificContent()}
    </DashboardLayout>
  );
}
