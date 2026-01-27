"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import { Table, Modal, ConfirmDialog, PageHeader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { departmentsApi, companiesApi } from "@/services/api";
import { subscribeToNotifications } from "@/services/socket";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Department, Company, NotificationPayload } from "@/types";

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
  const [error, setError] = useState<string | null>(null);

  const canManage = hasRole(["super_admin", "company_admin"]);
  const isSuperAdmin = hasRole("super_admin");

  const fetchData = useCallback(async () => {
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
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to real-time notifications for department changes
  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      (notification: NotificationPayload) => {
        const departmentEvents = [
          "department:created",
          "department:updated",
          "department:deleted",
        ];

        if (departmentEvents.includes(notification.type)) {
          console.log(
            "Real-time update: Refreshing departments data",
            notification.type
          );
          fetchData();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

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
    setError(null);
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
    setError(null);

    try {
      await departmentsApi.delete(selectedDepartment.id);
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const message =
        axiosError.response?.data?.message || "Failed to delete department";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: "rowNumber",
      header: "#",
      render: (_dept: Department, index: number) => index + 1,
    },
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
      <PageHeader
        title="Departments"
        subtitle="Manage organization departments"
        actions={
          canManage ? (
            <button
              onClick={openCreateModal}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
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
        error={error}
      />
    </DashboardLayout>
  );
}
