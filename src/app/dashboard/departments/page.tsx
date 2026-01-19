"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Table, Modal, ConfirmDialog } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { departmentsApi, companiesApi } from "@/services/api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Department, Company } from "@/types";

export default function DepartmentsPage() {
  const { hasRole } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    companyId: 0,
  });

  const canManage = hasRole(["super_admin", "company_admin"]);
  const isSuperAdmin = hasRole("super_admin");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptRes, compRes] = await Promise.all([
        departmentsApi.getAll(),
        isSuperAdmin
          ? companiesApi.getAll()
          : Promise.resolve({ data: { data: [] } }),
      ]);
      setDepartments(deptRes.data.data);
      setCompanies(compRes.data.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedDepartment(null);
    setFormData({ name: "", companyId: companies[0]?.id || 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      companyId: dept.company?.id || 0,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedDepartment) {
        await departmentsApi.update(selectedDepartment.id, {
          name: formData.name,
        });
      } else {
        await departmentsApi.create(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save department:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;
    setIsSubmitting(true);

    try {
      await departmentsApi.delete(selectedDepartment.id);
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to delete department:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "id", header: "ID", sortable: true },
    { key: "name", header: "Name", sortable: true },
    {
      key: "company",
      header: "Company",
      render: (dept: Department) => dept.company?.name || "-",
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (dept: Department) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(dept)}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteDialog(dept)}
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
    <DashboardLayout title="Departments">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Departments
          </h2>
          <p className="text-slate-500 dark:text-dark-muted mt-1">
            Manage organization departments
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

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
        title={selectedDepartment ? "Edit Department" : "Create Department"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Department Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              placeholder="Enter department name"
              required
            />
          </div>

          {!selectedDepartment && isSuperAdmin && (
            <div>
              <label className="label">Company</label>
              <select
                value={formData.companyId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    companyId: Number(e.target.value),
                  })
                }
                className="input"
                required
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting
                ? "Saving..."
                : selectedDepartment
                ? "Update"
                : "Create"}
            </button>
          </div>
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
      />
    </DashboardLayout>
  );
}
