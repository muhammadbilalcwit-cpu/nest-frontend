'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table, Modal, ConfirmDialog, PageHeader, Badge, getRoleVariant, getStatusVariant, FormField, FormSelect, Button, IconActionButton, ModalFooter } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { usersApi, departmentsApi, rolesApi, companiesApi } from '@/services/api';
import { subscribeToNotifications } from '@/services/socket';
import { Plus, Pencil, Trash2, Shield, X, Power } from 'lucide-react';
import type { User, Department, Company, Role, NotificationPayload } from '@/types';

export default function UsersPage() {
  const { hasRole, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    firstname: '',
    lastname: '',
    password: '',
    companyId: 0,
    departmentId: 0,
    roleSlug: 'user',
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = hasRole('super_admin');
  const isCompanyAdmin = hasRole('company_admin');
  const canManage = hasRole(['super_admin', 'company_admin']);
  const canAssignRoles = hasRole(['super_admin', 'company_admin']);
  const canChangeStatus = hasRole(['super_admin', 'company_admin']);

  // Get current user's company ID (for company_admin)
  // Option C: Use user.company directly as single source of truth
  const currentUserCompanyId = useMemo(() => {
    // First check user.company (Option C - single source of truth)
    if (currentUser?.company && typeof currentUser.company === 'object') {
      return (currentUser.company as Company).id;
    }
    // Fallback to department.company for backwards compatibility
    if (currentUser?.department && typeof currentUser.department === 'object') {
      return (currentUser.department as Department).company?.id;
    }
    return undefined;
  }, [currentUser]);

  // Filter departments based on selected company (for super_admin) or current user's company (for company_admin)
  const filteredDepartments = useMemo(() => {
    if (isSuperAdmin) {
      // Super admin: filter by selected company
      if (formData.companyId) {
        return departments.filter((d) => d.company?.id === formData.companyId);
      }
      return departments;
    } else if (isCompanyAdmin && currentUserCompanyId) {
      // Company admin: only show departments from their company
      return departments.filter((d) => d.company?.id === currentUserCompanyId);
    }
    return departments;
  }, [departments, formData.companyId, isSuperAdmin, isCompanyAdmin, currentUserCompanyId]);

  // Filter roles based on current user's role (case-insensitive)
  const availableRoles = useMemo(() => {
    if (isSuperAdmin) {
      // Super admin can create company_admin, manager, user (not super_admin - only one exists)
      return roles.filter((r) =>
        ['company_admin', 'manager', 'user'].includes(r.slug?.toLowerCase())
      );
    } else if (isCompanyAdmin) {
      // Company admin can only create manager and user roles
      return roles.filter((r) =>
        ['manager', 'user'].includes(r.slug?.toLowerCase())
      );
    }
    return roles.filter((r) => r.slug?.toLowerCase() === 'user');
  }, [roles, isSuperAdmin, isCompanyAdmin]);

  // Determine if company selection should be shown (case-insensitive)
  const showCompanySelect = useMemo(() => {
    // Only super_admin can select company
    // Company is required for company_admin, manager, user roles
    if (!isSuperAdmin) return false;
    return ['company_admin', 'manager', 'user'].includes(formData.roleSlug?.toLowerCase());
  }, [isSuperAdmin, formData.roleSlug]);

  // Determine if department selection should be shown (case-insensitive)
  const showDepartmentSelect = useMemo(() => {
    // Department is required for manager and user roles
    return ['manager', 'user'].includes(formData.roleSlug?.toLowerCase());
  }, [formData.roleSlug]);

  const fetchData = useCallback(async () => {
    try {
      const canAccessCompanies = isSuperAdmin || isCompanyAdmin;

      const [usersRes, deptsRes, rolesRes, companiesRes] = await Promise.all([
        usersApi.getAll(includeInactive),
        departmentsApi.getAll(),
        rolesApi.getAll(),
        canAccessCompanies
          ? companiesApi.getAll().catch(() => ({ data: { data: [] } }))
          : Promise.resolve({ data: { data: [] } }),
      ]);

      setUsers(usersRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      setRoles(rolesRes.data.data || []);
      setCompanies(companiesRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, isSuperAdmin, isCompanyAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset department when company changes
  useEffect(() => {
    if (formData.companyId && formData.departmentId) {
      const dept = departments.find((d) => d.id === formData.departmentId);
      if (dept && dept.company?.id !== formData.companyId) {
        setFormData((prev) => ({ ...prev, departmentId: 0 }));
      }
    }
  }, [formData.companyId, formData.departmentId, departments]);

  // Subscribe to real-time notifications for user changes
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification: NotificationPayload) => {
      // Refresh data when user-related events occur
      const userEvents = [
        'user:created',
        'user:updated',
        'user:deleted',
        'user:activated',
        'user:deactivated',
        'user:roles_assigned',
        'user:role_removed',
      ];

      if (userEvents.includes(notification.type)) {
        console.log('Real-time update: Refreshing users data', notification.type);
        fetchData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  const openCreateModal = () => {
    setSelectedUser(null);
    const defaultRole = isCompanyAdmin ? 'user' : 'user';
    setFormData({
      email: '',
      firstname: '',
      lastname: '',
      password: '',
      companyId: currentUserCompanyId || 0,
      departmentId: 0,
      roleSlug: defaultRole,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      password: '',
      // Option C: Use user.company directly as single source of truth
      companyId: user.company?.id || user.department?.company?.id || 0,
      departmentId: user.department?.id || 0,
      roleSlug: '',
    });
    setIsModalOpen(true);
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles([]); // Start with empty selection for adding new roles
    setIsRoleModalOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const openStatusDialog = (user: User) => {
    setSelectedUser(user);
    setIsStatusDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedUser) {
        const updateData: Partial<User> & { password?: string } = {
          firstname: formData.firstname,
          lastname: formData.lastname,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await usersApi.update(selectedUser.id, updateData);
      } else {
        // For company_admin: send companyId, no departmentId
        // For manager/user: send departmentId
        const isCompanyAdminRole = formData.roleSlug?.toLowerCase() === 'company_admin';
        await usersApi.create({
          email: formData.email,
          firstname: formData.firstname,
          lastname: formData.lastname,
          password: formData.password,
          departmentId: showDepartmentSelect ? formData.departmentId : undefined,
          companyId: isCompanyAdminRole && formData.companyId ? formData.companyId : undefined,
          roleSlug: formData.roleSlug,
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRoles = async () => {
    if (!selectedUser || selectedRoles.length === 0) return;
    setIsSubmitting(true);

    try {
      // Get current secondary roles
      const primaryRoleSlug = typeof selectedUser.role === 'string'
        ? selectedUser.role
        : selectedUser.role?.slug;
      const currentSecondaryRoles = selectedUser.roles
        ?.map((r) => (typeof r === 'string' ? r : r.slug))
        .filter((slug) => slug?.toLowerCase() !== primaryRoleSlug?.toLowerCase()) || [];

      // Combine existing secondary roles with new selections (remove duplicates)
      const allRoles = Array.from(new Set([...currentSecondaryRoles, ...selectedRoles]));

      await usersApi.assignRoles(selectedUser.id, allRoles);
      setIsRoleModalOpen(false);
      setSelectedRoles([]);
      fetchData();
    } catch (error) {
      console.error('Failed to assign roles:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRole = async (roleSlug: string) => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      await usersApi.removeRole(selectedUser.id, roleSlug);
      fetchData();
      // Update selectedUser to reflect the change
      setSelectedUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          roles: prev.roles?.filter((r) => {
            const slug = typeof r === 'string' ? r : r.slug;
            return slug?.toLowerCase() !== roleSlug.toLowerCase();
          }),
        };
      });
    } catch (error) {
      console.error('Failed to remove role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await usersApi.delete(selectedUser.id);
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Failed to delete user';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const newStatus = !selectedUser.isActive;
      await usersApi.updateStatus(selectedUser.id, newStatus);
      setIsStatusDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current user can change status of target user
  const canChangeUserStatus = (targetUser: User) => {
    if (!canChangeStatus) return false;

    const targetRoles = targetUser.roles?.map((r) =>
      (typeof r === 'string' ? r : r.slug)?.toLowerCase()
    ) || [];
    const targetPrimaryRole = typeof targetUser.role === 'string'
      ? targetUser.role.toLowerCase()
      : targetUser.role?.slug?.toLowerCase();
    const allTargetRoles = targetPrimaryRole
      ? [targetPrimaryRole, ...targetRoles]
      : targetRoles;

    // super_admin cannot change status of other super_admins
    if (isSuperAdmin && allTargetRoles.includes('super_admin')) {
      return false;
    }

    // company_admin cannot change status of super_admin or company_admin
    if (isCompanyAdmin) {
      if (allTargetRoles.includes('super_admin') || allTargetRoles.includes('company_admin')) {
        return false;
      }
    }

    return true;
  };

  const getRoleBadge = (user: User) => {
    const userRoles = user.roles || (user.role ? [user.role] : []);
    if (userRoles.length === 0) return <Badge label="No role" variant="default" />;

    return (
      <div className="flex flex-wrap gap-1">
        {userRoles.slice(0, 2).map((role, index) => {
          const slug = typeof role === 'string' ? role : role.slug;
          return (
            <Badge key={index} label={slug.replace('_', ' ')} variant={getRoleVariant(slug)} />
          );
        })}
        {userRoles.length > 2 && (
          <Badge label={`+${userRoles.length - 2}`} variant="default" />
        )}
      </div>
    );
  };

  const columns = [
    {
      key: 'rowNumber',
      header: '#',
      render: (_user: User, index: number) => index + 1,
    },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => {
        const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ');
        return fullName || '-';
      },
    },
    {
      key: 'department',
      header: 'Department',
      render: (user: User) => user.department?.name || '-',
    },
    {
      key: 'company',
      header: 'Company',
      // Option C: Prioritize user.company as single source of truth
      render: (user: User) => user.company?.name || user.department?.company?.name || '-',
    },
    {
      key: 'roles',
      header: 'Roles',
      render: getRoleBadge,
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => {
        const isActive = user.isActive !== false;
        return <Badge label={isActive ? 'Active' : 'Inactive'} variant={getStatusVariant(isActive)} />;
      },
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (user: User) => (
              <div className="flex items-center gap-2">
                {canAssignRoles && (
                  <IconActionButton
                    onClick={() => openRoleModal(user)}
                    icon={<Shield className="w-4 h-4" />}
                    color="amber"
                    title="Manage Roles"
                  />
                )}
                {canChangeUserStatus(user) && (
                  <IconActionButton
                    onClick={() => openStatusDialog(user)}
                    icon={<Power className="w-4 h-4" />}
                    color={user.isActive !== false ? 'orange' : 'green'}
                    title={user.isActive !== false ? 'Deactivate User' : 'Activate User'}
                  />
                )}
                <IconActionButton
                  onClick={() => openEditModal(user)}
                  icon={<Pencil className="w-4 h-4" />}
                  color="primary"
                  title="Edit"
                />
                <IconActionButton
                  onClick={() => openDeleteDialog(user)}
                  icon={<Trash2 className="w-4 h-4" />}
                  color="danger"
                  title="Delete"
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <DashboardLayout title="Users">
      <PageHeader
        title="Users"
        subtitle="Manage department users"
        actions={
          <>
            {canChangeStatus && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600 dark:text-dark-muted">
                  Show inactive users
                </span>
              </label>
            )}
            {canManage && (
              <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
                Add User
              </Button>
            )}
          </>
        }
      />

      <Table
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        isLoading={isLoading}
        emptyMessage="No users found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? 'Edit User' : 'Create User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!selectedUser && (
            <FormField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email"
              required
            />
          )}

          <FormField
            label="First Name"
            type="text"
            value={formData.firstname}
            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
            placeholder="Enter first name"
          />

          <FormField
            label="Last Name"
            type="text"
            value={formData.lastname}
            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
            placeholder="Enter last name"
          />

          <FormField
            label={selectedUser ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter password"
            required={!selectedUser}
          />

          {!selectedUser && (
            <>
              {/* Role Selection */}
              <FormSelect
                label="Role"
                value={formData.roleSlug}
                onChange={(e) => setFormData({ ...formData, roleSlug: e.target.value, companyId: 0, departmentId: 0 })}
                options={availableRoles.map((role) => ({
                  value: role.slug,
                  label: role.name,
                }))}
                placeholder="Select a role"
                required
              />

              {/* Company Selection - Only for super_admin and certain roles */}
              {showCompanySelect && (
                <FormSelect
                  label="Company"
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: Number(e.target.value), departmentId: 0 })}
                  options={companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                  }))}
                  placeholder="Select a company"
                  required
                />
              )}

              {/* Department Selection - For manager and user roles */}
              {showDepartmentSelect && (
                <FormSelect
                  label="Department"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                  options={filteredDepartments.map((dept) => ({
                    value: dept.id,
                    label: `${dept.name}${isSuperAdmin && dept.company ? ` (${dept.company.name})` : ''}`,
                  }))}
                  placeholder={isSuperAdmin && !formData.companyId ? 'Select a company first' : 'Select a department'}
                  required
                  disabled={isSuperAdmin && !formData.companyId}
                />
              )}
            </>
          )}

          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            submitLabel={selectedUser ? 'Update' : 'Create'}
            isLoading={isSubmitting}
          />
        </form>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Manage Roles"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-dark-muted">
            Manage roles for <strong>{selectedUser?.email}</strong>
          </p>

          {/* Primary Role (read-only) */}
          {selectedUser?.role && (
            <div>
              <label className="label text-xs uppercase tracking-wide">Primary Role</label>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="badge badge-primary">
                  {typeof selectedUser.role === 'string'
                    ? selectedUser.role
                    : selectedUser.role.name || selectedUser.role.slug}
                </span>
              </div>
            </div>
          )}

          {/* Current Secondary Roles (removable) */}
          {(() => {
            const primarySlug = typeof selectedUser?.role === 'string'
              ? selectedUser.role
              : selectedUser?.role?.slug;
            const secondaryRoles = selectedUser?.roles?.filter((r) => {
              const slug = typeof r === 'string' ? r : r.slug;
              return slug?.toLowerCase() !== primarySlug?.toLowerCase();
            }) || [];

            // Filter: company_admin cannot remove super_admin or company_admin
            const removableRoles = secondaryRoles.filter((r) => {
              const slug = typeof r === 'string' ? r : r.slug;
              if (isCompanyAdmin && ['super_admin', 'company_admin'].includes(slug?.toLowerCase() || '')) {
                return false;
              }
              return true;
            });

            if (secondaryRoles.length === 0) return null;

            return (
              <div>
                <label className="label text-xs uppercase tracking-wide">Current Secondary Roles</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  {secondaryRoles.map((r) => {
                    const slug = typeof r === 'string' ? r : r.slug;
                    const name = typeof r === 'string' ? r : r.name;
                    const canRemove = removableRoles.some((rr) => {
                      const rrSlug = typeof rr === 'string' ? rr : rr.slug;
                      return rrSlug === slug;
                    });

                    return (
                      <span
                        key={slug}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          slug === 'company_admin'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : slug === 'manager'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {name}
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRole(slug)}
                            disabled={isSubmitting}
                            className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                            title={`Remove ${name} role`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Add New Secondary Roles */}
          {(() => {
            const currentRoleSlugs = selectedUser?.roles?.map((r) =>
              (typeof r === 'string' ? r : r.slug)?.toLowerCase()
            ) || [];
            const primaryRoleSlug = typeof selectedUser?.role === 'string'
              ? selectedUser.role.toLowerCase()
              : selectedUser?.role?.slug?.toLowerCase();

            const availableToAdd = roles.filter((role) => {
              const slug = role.slug?.toLowerCase();
              // super_admin cannot be assigned as secondary role
              if (slug === 'super_admin') return false;
              // Filter out primary role
              if (primaryRoleSlug === slug) return false;
              // Filter out already assigned secondary roles
              if (currentRoleSlugs.includes(slug || '')) return false;
              // company_admin cannot assign company_admin
              if (isCompanyAdmin && slug === 'company_admin') return false;
              return true;
            });

            if (availableToAdd.length === 0) {
              return (
                <div>
                  <label className="label text-xs uppercase tracking-wide">Add Secondary Roles</label>
                  <p className="text-sm text-slate-500 dark:text-dark-muted p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    No additional roles available to assign.
                  </p>
                </div>
              );
            }

            return (
              <div>
                <label className="label text-xs uppercase tracking-wide">Add Secondary Roles</label>
                <div className="space-y-2">
                  {availableToAdd.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.slug]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((r) => r !== role.slug));
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                      />
                      <span className="text-slate-700 dark:text-dark-text">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}

          <ModalFooter
            onCancel={() => setIsRoleModalOpen(false)}
            cancelLabel="Close"
            submitLabel={`Add ${selectedRoles.length} Role${selectedRoles.length > 1 ? 's' : ''}`}
            isSubmit={false}
            onSubmit={handleAssignRoles}
            isLoading={isSubmitting}
            loadingText="Adding..."
            disabled={selectedRoles.length === 0}
          />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.email}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={isSubmitting}
        error={error}
      />

      {/* Status Change Confirmation */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleStatusChange}
        title={selectedUser?.isActive !== false ? 'Deactivate User' : 'Activate User'}
        message={
          selectedUser?.isActive !== false
            ? `Are you sure you want to deactivate "${selectedUser?.email}"? They will not be able to log in.`
            : `Are you sure you want to activate "${selectedUser?.email}"? They will be able to log in again.`
        }
        confirmText={selectedUser?.isActive !== false ? 'Deactivate' : 'Activate'}
        isDestructive={selectedUser?.isActive !== false}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
