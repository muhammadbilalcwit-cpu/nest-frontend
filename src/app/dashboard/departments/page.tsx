'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout';
import { Table, Modal, ConfirmDialog, PageHeader, FormField, FormSelect, Button, IconActionButton, ModalFooter } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useDepartments, useCompanies } from '@/hooks/queries';
import { useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/mutations';
import { getErrorMessage } from '@/lib/error-utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Department } from '@/types';

export default function DepartmentsPage() {
  const hasRole = useAuthStore((s) => s.hasRole);
  const isSuperAdmin = hasRole('super_admin');
  const canManage = hasRole(['super_admin', 'company_admin']);

  const { data: departments = [], isLoading } = useDepartments();
  const { data: companies = [] } = useCompanies(isSuperAdmin);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', companyId: 0 });
  // const [error, setError] = useState<string | null>(null); // Uncomment for inline error display

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const isSubmitting = createDepartment.isPending || updateDepartment.isPending || deleteDepartment.isPending;

  const openCreateModal = () => {
    setSelectedDepartment(null);
    setFormData({ name: '', companyId: companies[0]?.id || 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({ name: dept.name, companyId: dept.company?.id || 0 });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    // setError(null); // Uncomment for inline error display
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDepartment) {
      updateDepartment.mutate(
        { id: selectedDepartment.id, data: { name: formData.name } },
        {
          onSuccess: () => {
            toast.success('Department updated successfully');
            setIsModalOpen(false);
          },
          onError: (err) => {
            toast.error(getErrorMessage(err, 'Failed to update department'));
          },
        }
      );
    } else {
      createDepartment.mutate(formData, {
        onSuccess: () => {
          toast.success('Department created successfully');
          setIsModalOpen(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, 'Failed to create department'));
        },
      });
    }
  };

  const handleDelete = () => {
    if (!selectedDepartment) return;
    // setError(null); // Uncomment for inline error display

    deleteDepartment.mutate(selectedDepartment.id, {
      onSuccess: () => {
        toast.success('Department deleted successfully');
        setIsDeleteDialogOpen(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, 'Failed to delete department'));
        // setError(getErrorMessage(err, 'Failed to delete department')); // Uncomment for inline error display
      },
    });
  };

  const columns = [
    {
      key: 'rowNumber',
      header: '#',
      render: (_dept: Department, index: number) => index + 1,
    },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'company',
      header: 'Company',
      render: (dept: Department) => dept.company?.name || '-',
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (dept: Department) => (
              <div className="flex items-center gap-2">
                <IconActionButton
                  onClick={() => openEditModal(dept)}
                  icon={<Pencil className="w-4 h-4" />}
                  color="primary"
                  title="Edit"
                />
                <IconActionButton
                  onClick={() => openDeleteDialog(dept)}
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
    <DashboardLayout title="Departments">
      <PageHeader
        title="Departments"
        subtitle="Manage organization departments"
        actions={
          canManage ? (
            <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
              Add Department
            </Button>
          ) : undefined
        }
      />

      <Table
        columns={columns}
        data={departments}
        keyExtractor={(dept) => dept.id}
        isLoading={isLoading}
        emptyMessage="No departments found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDepartment ? 'Edit Department' : 'Create Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Department Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter department name"
            required
          />

          {!selectedDepartment && isSuperAdmin && (
            <FormSelect
              label="Company"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: Number(e.target.value) })}
              options={companies.map((company) => ({ value: company.id, label: company.name }))}
              placeholder="Select a company"
              required
            />
          )}

          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            submitLabel={selectedDepartment ? 'Update' : 'Create'}
            isLoading={isSubmitting}
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${selectedDepartment?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={isSubmitting}
        // error={error} // Uncomment for inline error display
      />
    </DashboardLayout>
  );
}
