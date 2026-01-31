'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout';
import { Table, Modal, ConfirmDialog, PageHeader, FormField, FormTextarea, Button, IconActionButton, ModalFooter } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanies } from '@/hooks/queries';
import { useCreateCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/mutations';
import { getErrorMessage } from '@/lib/error-utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Company } from '@/types';

export default function CompaniesPage() {
  const hasRole = useAuthStore((s) => s.hasRole);
  const { data: companies = [], isLoading } = useCompanies();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '' });
  // const [error, setError] = useState<string | null>(null); // Uncomment for inline error display

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const canManage = hasRole('super_admin');
  const isSubmitting = createCompany.isPending || updateCompany.isPending || deleteCompany.isPending;

  const openCreateModal = () => {
    setSelectedCompany(null);
    setFormData({ name: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({ name: company.name, address: company.address || '' });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    // setError(null); // Uncomment for inline error display
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCompany) {
      updateCompany.mutate(
        { id: selectedCompany.id, data: formData },
        {
          onSuccess: () => {
            toast.success('Company updated successfully');
            setIsModalOpen(false);
          },
          onError: (err) => {
            toast.error(getErrorMessage(err, 'Failed to update company'));
          },
        }
      );
    } else {
      createCompany.mutate(formData, {
        onSuccess: () => {
          toast.success('Company created successfully');
          setIsModalOpen(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, 'Failed to create company'));
        },
      });
    }
  };

  const handleDelete = () => {
    if (!selectedCompany) return;
    // setError(null); // Uncomment for inline error display

    deleteCompany.mutate(selectedCompany.id, {
      onSuccess: () => {
        toast.success('Company deleted successfully');
        setIsDeleteDialogOpen(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, 'Failed to delete company'));
        // setError(getErrorMessage(err, 'Failed to delete company')); // Uncomment for inline error display
      },
    });
  };

  const columns = [
    {
      key: 'rowNumber',
      header: '#',
      render: (_company: Company, index: number) => index + 1,
    },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'address', header: 'Address' },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (company: Company) => (
              <div className="flex items-center gap-2">
                <IconActionButton
                  onClick={() => openEditModal(company)}
                  icon={<Pencil className="w-4 h-4" />}
                  color="primary"
                  title="Edit"
                />
                <IconActionButton
                  onClick={() => openDeleteDialog(company)}
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
    <DashboardLayout title="Companies">
      <PageHeader
        title="Companies"
        subtitle="Manage all registered companies"
        actions={
          canManage ? (
            <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
              Add Company
            </Button>
          ) : undefined
        }
      />

      <Table
        columns={columns}
        data={companies}
        keyExtractor={(company) => company.id}
        isLoading={isLoading}
        emptyMessage="No companies found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCompany ? 'Edit Company' : 'Create Company'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Company Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter company name"
            required
          />

          <FormTextarea
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter company address"
          />

          <ModalFooter
            onCancel={() => setIsModalOpen(false)}
            submitLabel={selectedCompany ? 'Update' : 'Create'}
            isLoading={isSubmitting}
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${selectedCompany?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={isSubmitting}
        // error={error} // Uncomment for inline error display
      />
    </DashboardLayout>
  );
}
