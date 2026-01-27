'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table, PageHeader, Badge, getRoleVariant } from '@/components/ui';
import { rolesApi } from '@/services/api';
import { Shield } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  slug: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await rolesApi.getAll();
      setRoles(response.data.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // getRoleBadgeColor replaced by getRoleVariant helper from Badge component

  const getRoleDescription = (slug: string) => {
    switch (slug) {
      case 'super_admin':
        return 'Full system access. Can manage all companies, departments, and users.';
      case 'company_admin':
        return 'Company-level access. Can manage departments and users within their company.';
      case 'manager':
        return 'Department-level access. Can view users within their department.';
      case 'user':
        return 'Basic access. Can view their own profile and update settings.';
      default:
        return 'Custom role with specific permissions.';
    }
  };

  const columns = [
    {
      key: 'rowNumber',
      header: '#',
      render: (_role: Role, index: number) => index + 1,
    },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'slug',
      header: 'Slug',
      render: (role: Role) => (
        <Badge label={role.slug} variant={getRoleVariant(role.slug)} />
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (role: Role) => (
        <span className="text-slate-500 dark:text-dark-muted text-sm">
          {getRoleDescription(role.slug)}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Roles">
      <PageHeader
        title="Roles"
        subtitle="View system roles and their permissions"
      />

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { slug: 'super_admin', name: 'Super Admin', color: 'red' },
          { slug: 'company_admin', name: 'Company Admin', color: 'amber' },
          { slug: 'manager', name: 'Manager', color: 'blue' },
          { slug: 'user', name: 'User', color: 'green' },
        ].map((role) => (
          <div key={role.slug} className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-${role.color}-100 dark:bg-${role.color}-900/30`}>
                <Shield className={`w-5 h-5 text-${role.color}-600 dark:text-${role.color}-400`} />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">{role.name}</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-dark-muted">
              {getRoleDescription(role.slug)}
            </p>
          </div>
        ))}
      </div>

      <Table
        columns={columns}
        data={roles}
        keyExtractor={(role) => role.id}
        isLoading={isLoading}
        emptyMessage="No roles found"
      />
    </DashboardLayout>
  );
}
