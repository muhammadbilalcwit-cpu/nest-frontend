"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import { Alert } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { activeSessionsApi } from "@/services/api";
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
import type {
  OnlineUserWithSessions,
  SessionDetails,
  UserStatusPayload,
  SessionAddedPayload,
  SessionRemovedPayload,
  CompanyStatus,
} from "@/types";
import clsx from "clsx";

// Helper to get browser icon
const getBrowserIcon = (browser: string) => {
  const browserLower = browser.toLowerCase();
  if (browserLower.includes("chrome")) return "🌐";
  if (browserLower.includes("firefox")) return "🦊";
  if (browserLower.includes("safari")) return "🧭";
  if (browserLower.includes("edge")) return "🌊";
  if (browserLower.includes("opera")) return "🔴";
  return "🌐";
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
  const { hasRole, user: currentUser } = useAuth();
  const isSuperAdmin = hasRole(["super_admin"]);
  // Company-level state (for super_admin)
  const [companies, setCompanies] = useState<CompanyStatus[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalOnline: 0,
    totalOffline: 0,
  });
  const [selectedCompany, setSelectedCompany] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // User-level state (only online users with sessions)
  const [users, setUsers] = useState<OnlineUserWithSessions[]>([]);
  const [stats, setStats] = useState({
    onlineUsers: 0,
    totalSessions: 0,
  });

  // UI state
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [revokingSession, setRevokingSession] = useState<number | null>(null);
  const [revokingUser, setRevokingUser] = useState<number | null>(null);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [confirmRevokeSession, setConfirmRevokeSession] = useState<
    number | null
  >(null);
  const [confirmRevokeUser, setConfirmRevokeUser] = useState<number | null>(
    null,
  );

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

  // Fetch companies for super_admin
  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await activeSessionsApi.getAllCompaniesStatus();
      setCompanies(response.data.data.companies);
      setGlobalStats({
        totalCompanies: response.data.data.totalCompanies,
        totalUsers: response.data.data.totalUsers,
        totalOnline: response.data.data.totalOnline,
        totalOffline: response.data.data.totalOffline,
      });
    } catch (error) {
      console.error("Failed to fetch companies status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch online users with sessions for company_admin
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await activeSessionsApi.getOnlineUsersWithSessions();
      setUsers(response.data.data.users);
      setStats({
        onlineUsers: response.data.data.onlineUsers,
        totalSessions: response.data.data.totalSessions,
      });
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch online users with sessions for super_admin drill-down
  const fetchCompanyUsers = useCallback(async (companyId: number) => {
    setIsLoading(true);
    try {
      const response =
        await activeSessionsApi.getCompanyUsersWithSessions(companyId);
      setUsers(response.data.data.users);
      setStats({
        onlineUsers: response.data.data.onlineUsers,
        totalSessions: response.data.data.totalSessions,
      });
    } catch (error) {
      console.error("Failed to fetch company users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle real-time user status changes
  const handleUserStatusChange = useCallback(
    (payload: UserStatusPayload) => {
      // For user going offline, remove from list
      if (!payload.isOnline) {
        // Only update if relevant to current view
        if (!isSuperAdmin || selectedCompany) {
          if (!selectedCompany || selectedCompany.id === payload.companyId) {
            setUsers((prev) => prev.filter((u) => u.id !== payload.userId));
            setStats((prev) => ({
              onlineUsers: Math.max(0, prev.onlineUsers - 1),
              totalSessions: prev.totalSessions, // Will be updated on refresh
            }));
          }
        }
      } else {
        // User came online - refresh to get their sessions
        if (!isSuperAdmin || selectedCompany) {
          if (!selectedCompany || selectedCompany.id === payload.companyId) {
            // Refresh to get the new user's sessions
            if (selectedCompany) {
              fetchCompanyUsers(selectedCompany.id);
            } else {
              fetchUsers();
            }
          }
        }
      }

      // Update company-level stats for super_admin
      if (isSuperAdmin) {
        setGlobalStats((prev) => {
          if (payload.isOnline) {
            return {
              ...prev,
              totalOnline: prev.totalOnline + 1,
              totalOffline: Math.max(0, prev.totalOffline - 1),
            };
          } else {
            return {
              ...prev,
              totalOnline: Math.max(0, prev.totalOnline - 1),
              totalOffline: prev.totalOffline + 1,
            };
          }
        });

        setCompanies((prevCompanies) =>
          prevCompanies.map((company) => {
            if (company.id === payload.companyId) {
              if (payload.isOnline) {
                return {
                  ...company,
                  onlineCount: company.onlineCount + 1,
                  offlineCount: Math.max(0, company.offlineCount - 1),
                };
              } else {
                return {
                  ...company,
                  onlineCount: Math.max(0, company.onlineCount - 1),
                  offlineCount: company.offlineCount + 1,
                };
              }
            }
            return company;
          }),
        );
      }
    },
    [isSuperAdmin, selectedCompany, fetchCompanyUsers, fetchUsers],
  );

  // Handle real-time session added events
  const handleSessionAdded = useCallback(
    (payload: SessionAddedPayload) => {
      // Only update if relevant to current view
      if (isSuperAdmin && !selectedCompany) {
        // On company list view, we don't need to update individual sessions
        return;
      }

      // Check if this session is for the company we're viewing
      if (selectedCompany && selectedCompany.id !== payload.companyId) {
        return;
      }

      // For company_admin without selectedCompany, always update
      setUsers((prevUsers) => {
        // Find if user already exists
        const existingUserIndex = prevUsers.findIndex(
          (u) => u.id === payload.userId,
        );

        const newSession: SessionDetails = {
          id: payload.sessionId,
          browser: payload.browser,
          os: payload.os,
          ipAddress: payload.ipAddress,
          loginAt: payload.loginAt,
          lastActivityAt: payload.lastActivityAt,
        };

        if (existingUserIndex >= 0) {
          // User exists, add session to their list
          const updatedUsers = [...prevUsers];
          const existingUser = updatedUsers[existingUserIndex];

          // Check if session already exists (avoid duplicates)
          if (existingUser.sessions.some((s) => s.id === payload.sessionId)) {
            return prevUsers;
          }

          updatedUsers[existingUserIndex] = {
            ...existingUser,
            sessions: [newSession, ...existingUser.sessions],
          };
          return updatedUsers;
        } else {
          // User doesn't exist, add new user with this session
          const newUser: OnlineUserWithSessions = {
            id: payload.userId,
            email: payload.email,
            firstname: payload.firstname,
            lastname: payload.lastname,
            sessions: [newSession],
          };
          return [newUser, ...prevUsers];
        }
      });

      // Update stats
      setStats((prev) => ({
        onlineUsers: prev.onlineUsers, // Will be recalculated based on users
        totalSessions: prev.totalSessions + 1,
      }));
    },
    [isSuperAdmin, selectedCompany],
  );

  // Handle real-time session removed events
  const handleSessionRemoved = useCallback(
    (payload: SessionRemovedPayload) => {
      // Only update if relevant to current view
      if (isSuperAdmin && !selectedCompany) {
        // On company list view, we don't need to update individual sessions
        return;
      }

      // Check if this session is for the company we're viewing
      if (selectedCompany && selectedCompany.id !== payload.companyId) {
        return;
      }

      setUsers((prevUsers) => {
        return prevUsers
          .map((user) => {
            if (user.id === payload.userId) {
              const updatedSessions = user.sessions.filter(
                (s) => s.id !== payload.sessionId,
              );
              return { ...user, sessions: updatedSessions };
            }
            return user;
          })
          .filter((user) => user.sessions.length > 0); // Remove users with no sessions
      });

      // Update stats
      setStats((prev) => ({
        onlineUsers: prev.onlineUsers, // Will be recalculated
        totalSessions: Math.max(0, prev.totalSessions - 1),
      }));
    },
    [isSuperAdmin, selectedCompany],
  );

  // Effect for fetching data based on view state
  useEffect(() => {
    if (isSuperAdmin && !selectedCompany) {
      fetchCompanies();
    } else if (isSuperAdmin && selectedCompany) {
      fetchCompanyUsers(selectedCompany.id);
    } else {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, selectedCompany?.id]);

  // Effect for real-time updates subscription
  useEffect(() => {
    const unsubscribeUserStatus = subscribeToUserStatusChanged(
      handleUserStatusChange,
    );
    const unsubscribeSessionAdded = subscribeToSessionAdded(handleSessionAdded);
    const unsubscribeSessionRemoved =
      subscribeToSessionRemoved(handleSessionRemoved);

    return () => {
      unsubscribeUserStatus();
      unsubscribeSessionAdded();
      unsubscribeSessionRemoved();
    };
  }, [
    handleUserStatusChange,
    handleSessionAdded,
    handleSessionRemoved,
  ]);

  // Revoke a specific session
  const handleRevokeSession = async (sessionId: number) => {
    setRevokingSession(sessionId);
    try {
      if (isSuperAdmin && selectedCompany) {
        await activeSessionsApi.revokeSpecificSessionForCompany(
          selectedCompany.id,
          sessionId,
        );
        await fetchCompanyUsers(selectedCompany.id);
      } else {
        await activeSessionsApi.revokeSpecificSession(sessionId);
        await fetchUsers();
      }
      setConfirmRevokeSession(null);
    } catch (error) {
      console.error("Failed to revoke session:", error);
    } finally {
      setRevokingSession(null);
    }
  };

  // Revoke all sessions for a user
  const handleRevokeAllUserSessions = async (userId: number) => {
    setRevokingUser(userId);
    try {
      await activeSessionsApi.revokeAllUserSessions(userId);
      if (selectedCompany) {
        await fetchCompanyUsers(selectedCompany.id);
      } else {
        await fetchUsers();
      }
      setConfirmRevokeUser(null);
    } catch (error) {
      console.error("Failed to revoke user sessions:", error);
    } finally {
      setRevokingUser(null);
    }
  };

  // Revoke all sessions in company
  const handleRevokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      if (isSuperAdmin && selectedCompany) {
        await activeSessionsApi.revokeAllSessionsForCompany(selectedCompany.id);
        await fetchCompanyUsers(selectedCompany.id);
      } else {
        await activeSessionsApi.revokeAllSessions();
        await fetchUsers();
      }
      setShowRevokeAllConfirm(false);
    } catch (error) {
      console.error("Failed to revoke all sessions:", error);
    } finally {
      setRevokingAll(false);
    }
  };

  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setUsers([]);
    setStats({ onlineUsers: 0, totalSessions: 0 });
    setExpandedUsers(new Set());
    setShowRevokeAllConfirm(false);
  };

  // Render session row
  const renderSessionRow = (
    session: SessionDetails,
    userId: number,
    isCurrentUser: boolean,
  ) => {
    const isRevoking = revokingSession === session.id;
    const showingConfirm = confirmRevokeSession === session.id;

    return (
      <div
        key={session.id}
        className="flex items-center justify-between py-2 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{getBrowserIcon(session.browser)}</span>
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
    const isRevoking = revokingUser === user.id;

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
              renderSessionRow(session, user.id, isCurrentUser),
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
  if (isSuperAdmin && !selectedCompany) {
    return (
      <DashboardLayout title="Active Sessions">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Active Sessions - All Companies
            </h2>
            <p className="text-slate-500 dark:text-dark-muted mt-1">
              Monitor user sessions across all companies
            </p>
          </div>

          <button
            onClick={fetchCompanies}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 self-start"
          >
            <RefreshCw
              className={clsx("w-4 h-4", isLoading && "animate-spin")}
            />
            Refresh
          </button>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Building className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Companies
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {globalStats.totalCompanies}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {globalStats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Online Now
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {globalStats.totalOnline}
                </p>
              </div>
            </div>
          </div>

          {/* <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Offline
                </p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                  {globalStats.totalOffline}
                </p>
              </div>
            </div>
          </div> */}
        </div>

        {/* Companies List */}
        {isLoading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500">Loading companies...</p>
          </div>
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {isSuperAdmin && selectedCompany && (
            <button
              onClick={handleBackToCompanies}
              className="flex items-center gap-1 text-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-3" />
              Back to Companies
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Active Sessions
            {selectedCompany && ` - ${selectedCompany.name}`}
          </h2>
          <p className="text-slate-500 dark:text-dark-muted mt-1">
            Monitor and manage online user sessions
            {selectedCompany
              ? ` in ${selectedCompany.name}`
              : " in your organization"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() =>
              selectedCompany
                ? fetchCompanyUsers(selectedCompany.id)
                : fetchUsers()
            }
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={clsx("w-4 h-4", isLoading && "animate-spin")}
            />
            Refresh
          </button>

          {stats.onlineUsers > 1 && !showRevokeAllConfirm && (
            <button
              onClick={() => setShowRevokeAllConfirm(true)}
              disabled={revokingAll}
              className="btn-danger flex items-center gap-2"
            >
              <ShieldOff className="w-4 h-4" />
              Revoke All
            </button>
          )}

          {showRevokeAllConfirm && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRevokeAllSessions}
                disabled={revokingAll}
                className="btn-danger flex items-center gap-2"
              >
                {revokingAll ? "Revoking..." : "Confirm Revoke All"}
              </button>
              <button
                onClick={() => setShowRevokeAllConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Online Users
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.onlineUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active Sessions
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalSessions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <Alert
        variant="info"
        message="Revoke Session will disconnect the specific browser/device. Revoke All for a user will disconnect all their active sessions. Users will need to log in again."
        className="mb-6"
      />

      {/* Users List */}
      {isLoading ? (
        <div className="card p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500">Loading sessions...</p>
        </div>
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
