'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Table, Modal, ConfirmDialog } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { companiesApi } from '@/services/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Company } from '@/types';

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

  const canManage = hasRole('super_admin');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await companiesApi.getAll();
      setCompanies(response.data.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

    try {
      await companiesApi.delete(selectedCompany.id);
      setIsDeleteDialogOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'address', header: 'Address' },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (company: Company) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(company)}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteDialog(company)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <DashboardLayout title="Companies">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Companies</h2>
          <p className="text-slate-500 dark:text-dark-muted mt-1">
            Manage all registered companies
          </p>
        </div>
        {canManage && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        )}
      </div>

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
          <div>
            <label className="label">Company Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Enter company name"
              required
            />
          </div>

          <div>
            <label className="label">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Enter company address"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : selectedCompany ? 'Update' : 'Create'}
            </button>
          </div>
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
      />
    </DashboardLayout>
  );
}
