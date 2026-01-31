"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout";
import { Alert, PageHeader, Button, LoadingSpinner, StatsCard } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/error-utils";
import {
  useCompaniesStatus,
  useOnlineUsersWithSessions,
  useCompanyUsersWithSessions,
} from "@/hooks/queries";
import {
  useRevokeSpecificSession,
  useRevokeSpecificSessionForCompany,
  useRevokeAllUserSessions,
  useRevokeAllSessions,
  useRevokeAllSessionsForCompany,
} from "@/hooks/mutations";
import {
  subscribeToUserStatusChanged,
  subscribeToSessionAdded,
  subscribeToSessionRemoved,
} from "@/services/socket";
import {
  Users,
  RefreshCw,
  UserX,
  Wifi,
  ShieldOff,
  Building,
  ChevronRight,
  ArrowLeft,
  Monitor,
  Smartphone,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import type { SessionDetails, CompanyStatus, OnlineUserWithSessions } from "@/types";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChrome,
  faFirefoxBrowser,
  faSafari,
  faEdge,
  faOpera,
} from "@fortawesome/free-brands-svg-icons";

// Helper to get browser icon
const getBrowserIcon = (browser: string) => {
  const browserLower = browser.toLowerCase();
  if (browserLower.includes("chrome"))
    return <FontAwesomeIcon icon={faChrome} className="w-4 h-4 text-[#4285F4]" />;
  if (browserLower.includes("firefox"))
    return <FontAwesomeIcon icon={faFirefoxBrowser} className="w-4 h-4 text-[#FF7139]" />;
  if (browserLower.includes("safari"))
    return <FontAwesomeIcon icon={faSafari} className="w-4 h-4 text-[#006CFF]" />;
  if (browserLower.includes("edge"))
    return <FontAwesomeIcon icon={faEdge} className="w-4 h-4 text-[#0078D7]" />;
  if (browserLower.includes("opera"))
    return <FontAwesomeIcon icon={faOpera} className="w-4 h-4 text-[#FF1B2D]" />;
  return <Globe className="w-4 h-4 text-slate-400" />;
};

// Helper to get OS icon
const getOsIcon = (os: string) => {
  const osLower = os.toLowerCase();
  if (osLower.includes("windows")) return <Monitor className="w-4 h-4" />;
  if (osLower.includes("mac") || osLower.includes("ios"))
    return <Monitor className="w-4 h-4" />;
  if (osLower.includes("android") || osLower.includes("mobile"))
    return <Smartphone className="w-4 h-4" />;
  if (osLower.includes("linux")) return <Monitor className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
};

// Helper to format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export default function ActiveSessionsPage() {
  const queryClient = useQueryClient();
  const hasRole = useAuthStore((s) => s.hasRole);
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = hasRole("super_admin");
  const isCompanyAdmin = hasRole("company_admin");

  // Navigation state for super admin drill-down
  const [selectedCompany, setSelectedCompany] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // UI state
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [confirmRevokeSession, setConfirmRevokeSession] = useState<number | null>(null);
  const [confirmRevokeUser, setConfirmRevokeUser] = useState<number | null>(null);

  // Query hooks - only enable queries based on user role
  // Super admin: uses companiesQuery first, then companyUsersQuery when drilling down
  // Company admin: uses usersQuery directly
  const companiesQuery = useCompaniesStatus(isSuperAdmin);
  const usersQuery = useOnlineUsersWithSessions(isCompanyAdmin && !isSuperAdmin);
  const companyUsersQuery = useCompanyUsersWithSessions(selectedCompany?.id ?? 0);

  // Mutation hooks
  const revokeSession = useRevokeSpecificSession();
  const revokeSessionForCompany = useRevokeSpecificSessionForCompany();
  const revokeAllUserSessions = useRevokeAllUserSessions();
  const revokeAllSessions = useRevokeAllSessions();
  const revokeAllSessionsForCompany = useRevokeAllSessionsForCompany();

  // Determine which data/loading state to use based on view
  const isCompanyListView = isSuperAdmin && !selectedCompany;
  const isLoading = isCompanyListView
    ? companiesQuery.isLoading
    : selectedCompany
      ? companyUsersQuery.isLoading
      : usersQuery.isLoading;

  // Get data based on view
  const companies = companiesQuery.data?.companies ?? [];
  const globalStats = {
    totalCompanies: companiesQuery.data?.totalCompanies ?? 0,
    totalUsers: companiesQuery.data?.totalUsers ?? 0,
    totalOnline: companiesQuery.data?.totalOnline ?? 0,
    totalOffline: companiesQuery.data?.totalOffline ?? 0,
  };

  const usersData = selectedCompany ? companyUsersQuery.data : usersQuery.data;
  const users = usersData?.users ?? [];
  const stats = {
    onlineUsers: usersData?.onlineUsers ?? 0,
    totalSessions: usersData?.totalSessions ?? 0,
  };

  // Socket subscriptions - invalidate queries on events
  useEffect(() => {
    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
    };

    const unsubscribeUserStatus = subscribeToUserStatusChanged(invalidateAll);
    const unsubscribeSessionAdded = subscribeToSessionAdded(invalidateAll);
    const unsubscribeSessionRemoved = subscribeToSessionRemoved(invalidateAll);

    return () => {
      unsubscribeUserStatus();
      unsubscribeSessionAdded();
      unsubscribeSessionRemoved();
    };
  }, [queryClient]);

  // Toggle expanded user
  const toggleUserExpanded = (userId: number) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Refresh handlers
  const handleRefresh = () => {
    if (isCompanyListView) {
      companiesQuery.refetch();
    } else if (selectedCompany) {
      companyUsersQuery.refetch();
    } else {
      usersQuery.refetch();
    }
  };

  // Revoke a specific session
  const handleRevokeSession = (sessionId: number) => {
    const mutationOptions = {
      onSuccess: () => {
        toast.success("Session revoked successfully");
        setConfirmRevokeSession(null);
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to revoke session"));
      },
    };

    if (isSuperAdmin && selectedCompany) {
      revokeSessionForCompany.mutate(
        { companyId: selectedCompany.id, sessionId },
        mutationOptions
      );
    } else {
      revokeSession.mutate(sessionId, mutationOptions);
    }
  };

  // Revoke all sessions for a user
  const handleRevokeAllUserSessions = (userId: number) => {
    revokeAllUserSessions.mutate(userId, {
      onSuccess: () => {
        toast.success("All user sessions revoked successfully");
        setConfirmRevokeUser(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err, "Failed to revoke user sessions"));
      },
    });
  };

  // Revoke all sessions in company
  const handleRevokeAllSessions = () => {
    const mutationOptions = {
      onSuccess: () => {
        toast.success("All sessions revoked successfully");
        setShowRevokeAllConfirm(false);
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to revoke all sessions"));
      },
    };

    if (isSuperAdmin && selectedCompany) {
      revokeAllSessionsForCompany.mutate(selectedCompany.id, mutationOptions);
    } else {
      revokeAllSessions.mutate(undefined, mutationOptions);
    }
  };

  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setExpandedUsers(new Set());
    setShowRevokeAllConfirm(false);
  };

  // Check if any mutation is pending
  const isRevokingSession = revokeSession.isPending || revokeSessionForCompany.isPending;
  const isRevokingUser = revokeAllUserSessions.isPending;
  const isRevokingAll = revokeAllSessions.isPending || revokeAllSessionsForCompany.isPending;

  // Render session row
  const renderSessionRow = (
    session: SessionDetails,
    isCurrentUser: boolean,
  ) => {
    const isRevoking = isRevokingSession && confirmRevokeSession === session.id;
    const showingConfirm = confirmRevokeSession === session.id;

    return (
      <div
        key={session.id}
        className="flex items-center justify-between py-2 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
      >
        <div className="flex items-center gap-3">
          {getBrowserIcon(session.browser)}
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            {getOsIcon(session.os)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {session.browser} · {session.os}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {session.ipAddress || "Unknown IP"} ·{" "}
              {formatTimeAgo(session.loginAt)}
            </div>
          </div>
        </div>

        {isCurrentUser ? (
          <span className="text-xs text-slate-400 italic">Current session</span>
        ) : showingConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRevokeSession(session.id)}
              disabled={isRevoking}
              className="btn-danger text-xs py-1 px-2"
            >
              {isRevoking ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmRevokeSession(null)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRevokeSession(session.id)}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
          >
            Revoke
          </button>
        )}
      </div>
    );
  };

  // Render user row with expandable sessions
  const renderUserRow = (user: OnlineUserWithSessions) => {
    const isExpanded = expandedUsers.has(user.id);
    const isCurrentUser = currentUser?.id === user.id;
    const showingConfirm = confirmRevokeUser === user.id;
    const isRevoking = isRevokingUser && confirmRevokeUser === user.id;

    return (
      <div key={user.id} className="card mb-3 overflow-hidden">
        {/* User header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
          onClick={() => toggleUserExpanded(user.id)}
        >
          <div className="flex items-center gap-4">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div>
              <div className="font-medium text-slate-900 dark:text-white">
                {user.firstname || user.lastname
                  ? `${user.firstname || ""} ${user.lastname || ""}`.trim()
                  : "N/A"}
                {isCurrentUser && (
                  <span className="ml-2 text-xs text-slate-400">(You)</span>
                )}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {user.sessions.length} session
              {user.sessions.length !== 1 ? "s" : ""}
            </div>

            {!isCurrentUser && user.sessions.length > 0 && (
              <>
                {showingConfirm ? (
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleRevokeAllUserSessions(user.id)}
                      disabled={isRevoking}
                      className="btn-danger text-xs py-1 px-2"
                    >
                      {isRevoking ? "..." : "Confirm All"}
                    </button>
                    <button
                      onClick={() => setConfirmRevokeUser(null)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmRevokeUser(user.id);
                    }}
                    className="btn-danger text-xs py-1 px-2 flex items-center gap-1"
                  >
                    <UserX className="w-3 h-3" />
                    Revoke All
                  </button>
                )}
              </>
            )}

            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Sessions list (expandable) */}
        {isExpanded && user.sessions.length > 0 && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            {user.sessions.map((session) =>
              renderSessionRow(session, isCurrentUser),
            )}
          </div>
        )}
      </div>
    );
  };

  // Company columns for super_admin table
  const renderCompanyRow = (company: CompanyStatus) => (
    <div
      key={company.id}
      className="card p-4 mb-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
      onClick={() => setSelectedCompany({ id: company.id, name: company.name })}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
          <Building className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </div>
        <div className="font-medium text-slate-900 dark:text-white">
          {company.name}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">Total: </span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {company.totalUsers}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              company.onlineCount > 0 ? "bg-green-500" : "bg-slate-300",
            )}
          />
          <span
            className={clsx(
              "font-medium",
              company.onlineCount > 0
                ? "text-green-600 dark:text-green-400"
                : "text-slate-500",
            )}
          >
            {company.onlineCount} online
          </span>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>
    </div>
  );

  // Super Admin - Company List View
  if (isCompanyListView) {
    return (
      <DashboardLayout title="Active Sessions">
        <PageHeader
          title="Active Sessions - All Companies"
          subtitle="Monitor user sessions across all companies"
          actions={
            <Button
              variant="secondary"
              onClick={() => companiesQuery.refetch()}
              disabled={isLoading}
              icon={<RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin")} />}
            >
              Refresh
            </Button>
          }
        />

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Companies" value={globalStats.totalCompanies} icon={<Building className="w-6 h-6" />} color="primary" />
          <StatsCard title="Total Users" value={globalStats.totalUsers} icon={<Users className="w-6 h-6" />} color="primary" />
          <StatsCard title="Online Now" value={globalStats.totalOnline} icon={<Wifi className="w-6 h-6" />} color="success" />
        </div>

        {/* Companies List */}
        {isLoading ? (
          <LoadingSpinner message="Loading companies..." />
        ) : companies.length === 0 ? (
          <div className="card p-8 text-center">
            <Building className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No companies found</p>
          </div>
        ) : (
          <div>{companies.map(renderCompanyRow)}</div>
        )}
      </DashboardLayout>
    );
  }

  // Company Admin View or Super Admin Drill-down View
  return (
    <DashboardLayout title="Active Sessions">
      {isSuperAdmin && selectedCompany && (
        <button
          onClick={handleBackToCompanies}
          className="flex items-center gap-1 text-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-3" />
          Back to Companies
        </button>
      )}

      <PageHeader
        title={`Active Sessions${selectedCompany ? ` - ${selectedCompany.name}` : ""}`}
        subtitle={`Monitor and manage online user sessions${selectedCompany ? ` in ${selectedCompany.name}` : " in your organization"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              icon={<RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin")} />}
            >
              Refresh
            </Button>

            {stats.onlineUsers > 1 && !showRevokeAllConfirm && (
              <Button
                variant="danger"
                onClick={() => setShowRevokeAllConfirm(true)}
                disabled={isRevokingAll}
                icon={<ShieldOff className="w-4 h-4" />}
              >
                Revoke All
              </Button>
            )}

            {showRevokeAllConfirm && (
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  onClick={handleRevokeAllSessions}
                  isLoading={isRevokingAll}
                  loadingText="Revoking..."
                >
                  Confirm Revoke All
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowRevokeAllConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatsCard title="Online Users" value={stats.onlineUsers} icon={<Wifi className="w-6 h-6" />} color="success" />
        <StatsCard title="Active Sessions" value={stats.totalSessions} icon={<Monitor className="w-6 h-6" />} color="primary" />
      </div>

      {/* Info Banner */}
      <Alert
        variant="info"
        message="Revoke Session will disconnect the specific browser/device. Revoke All for a user will disconnect all their active sessions. Users will need to log in again."
        className="mb-6"
      />

      {/* Users List */}
      {isLoading ? (
        <LoadingSpinner message="Loading sessions..." />
      ) : users.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No Users Online
          </h3>
          <p className="text-slate-500 dark:text-dark-muted">
            There are no users currently online
            {selectedCompany ? ` in ${selectedCompany.name}` : ""}.
          </p>
        </div>
      ) : (
        <div>{users.map(renderUserRow)}</div>
      )}
    </DashboardLayout>
  );
}
