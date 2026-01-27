'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table, Modal, ConfirmDialog, PageHeader, FormField, FormTextarea, Button, IconActionButton, ModalFooter } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { companiesApi } from '@/services/api';
import { subscribeToNotifications } from '@/services/socket';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Company, NotificationPayload } from '@/types';

export default function CompaniesPage() {
  const { hasRole } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);

  const canManage = hasRole('super_admin');

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companiesApi.getAll();
      setCompanies(response.data.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Subscribe to real-time notifications for company changes
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      (notification: NotificationPayload) => {
        // Refresh data when company-related events occur
        const companyEvents = [
          'company:created',
          'company:updated',
          'company:deleted',
        ];

        if (companyEvents.includes(notification.type)) {
          console.log(
            'Real-time update: Refreshing companies data',
            notification.type
          );
          fetchCompanies();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [fetchCompanies]);

  const openCreateModal = () => {
    setSelectedCompany(null);
    setFormData({ name: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      address: company.address || '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedCompany) {
        await companiesApi.update(selectedCompany.id, formData);
      } else {
        await companiesApi.create(formData);
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Failed to save company:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await companiesApi.delete(selectedCompany.id);
      setIsDeleteDialogOpen(false);
      fetchCompanies();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || 'Failed to delete company';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
        error={error}
      />
    </DashboardLayout>
  );
}
