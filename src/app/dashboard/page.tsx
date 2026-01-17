'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { StatsCard } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { companiesApi, departmentsApi, usersApi } from '@/services/api';
import { Building, FolderTree, Users, Activity } from 'lucide-react';
import type { Company, Department, User } from '@/types';

export default function DashboardPage() {
  const { primaryRole, user } = useAuth();
  const [stats, setStats] = useState({
    companies: 0,
    departments: 0,
    users: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const promises: Promise<unknown>[] = [];

        if (primaryRole === 'super_admin') {
          promises.push(
            companiesApi.getAll().then((res) => res.data.data),
            departmentsApi.getAll().then((res) => res.data.data),
            usersApi.getAll().then((res) => res.data.data)
          );

          const [companies, departments, users] = await Promise.all(promises) as [Company[], Department[], User[]];
          setStats({
            companies: companies.length,
            departments: departments.length,
            users: users.length,
          });
        } else if (primaryRole === 'company_admin' || primaryRole === 'manager') {
          const [departments, users] = await Promise.all([
            departmentsApi.getAll().then((res) => res.data.data),
            usersApi.getAll().then((res) => res.data.data),
          ]) as [Department[], User[]];

          setStats({
            companies: 1, // Their own company
            departments: departments.length,
            users: users.length,
          });
        } else {
          // Regular user
          setStats({
            companies: 0,
            departments: 0,
            users: 0,
          });
        }

      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [primaryRole]);

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
                  <a
                    href="/dashboard/companies"
                    className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-primary-600" />
                      <span className="text-slate-700 dark:text-dark-text">Manage Companies</span>
                    </div>
                  </a>
                  <a
                    href="/dashboard/departments"
                    className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderTree className="w-5 h-5 text-green-600" />
                      <span className="text-slate-700 dark:text-dark-text">Manage Departments</span>
                    </div>
                  </a>
                  <a
                    href="/dashboard/users"
                    className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-amber-600" />
                      <span className="text-slate-700 dark:text-dark-text">Manage Users</span>
                    </div>
                  </a>
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
                <a
                  href="/dashboard/departments"
                  className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderTree className="w-5 h-5 text-primary-600" />
                    <span className="text-slate-700 dark:text-dark-text">Manage Departments</span>
                  </div>
                </a>
                <a
                  href="/dashboard/users"
                  className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700 dark:text-dark-text">Manage Users</span>
                  </div>
                </a>
                <a
                  href="/dashboard/activity-logs"
                  className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-amber-600" />
                    <span className="text-slate-700 dark:text-dark-text">View Activity Logs</span>
                  </div>
                </a>
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
              <a
                href="/dashboard/users"
                className="block p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary-600" />
                  <span className="text-slate-700 dark:text-dark-text">View Team Members</span>
                </div>
              </a>
            </div>
          </>
        );

      default:
        return (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Welcome to Enterprise MS
            </h3>
            <p className="text-slate-500 dark:text-dark-muted mb-6">
              Manage your profile and preferences from the settings page.
            </p>
            <a href="/dashboard/settings" className="btn-primary inline-block">
              Go to Settings
            </a>
          </div>
        );
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {getWelcomeMessage()}
        </h2>
        <p className="text-slate-500 dark:text-dark-muted mt-1">
          Here&apos;s what&apos;s happening in your organization today.
        </p>
      </div>

      {getRoleSpecificContent()}
    </DashboardLayout>
  );
}
