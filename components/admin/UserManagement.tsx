"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useAdminUsers,
  useAdminInvitations,
  useInviteUser,
  useDeleteInvitation,
  useResendInvitation,
  useDeleteUser,
  useUpdateUserRole,
} from "@/lib/hooks/useAdmin";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/Tooltip";
import { RefreshButton } from "@/components/ui/RefreshButton";
import type { UserRole } from "@/lib/types";
import {
  UserPlus,
  Users,
  Mail,
  Shield,
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  Search,
  UserCheck,
  RotateCw,
  MoreVertical,
} from "lucide-react";

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: "ADMIN", label: "Admin", color: "bg-rose-600/20 text-rose-400 border-rose-500/20" },
  { value: "MENTOR_MANAGER", label: "Mentor Manager", color: "bg-purple-600/20 text-purple-400 border-purple-500/20" },
  { value: "MENTOR", label: "Mentor", color: "bg-indigo-600/20 text-indigo-400 border-indigo-500/20" },
  { value: "STUDENT", label: "Student", color: "bg-emerald-600/20 text-emerald-400 border-emerald-500/20" },
  { value: "LETTER_WRITER", label: "Letter Writer", color: "bg-cyan-600/20 text-cyan-400 border-cyan-500/20" },
  { value: "SETTER", label: "Setter", color: "bg-amber-600/20 text-amber-400 border-amber-500/20" },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<"invite" | "users" | "invitations">("users");

  // Data fetching
  const { data: users = [], isLoading: usersLoading, isFetching: usersFetching, error: usersError, refetch: refetchUsers } = useAdminUsers();
  const { data: invitations = [], isLoading: invitesLoading, isFetching: invitesFetching, refetch: refetchInvites } = useAdminInvitations();

  // Mutations
  const inviteMutation = useInviteUser();
  const deleteInviteMutation = useDeleteInvitation();
  const resendInviteMutation = useResendInvitation();
  const deleteUserMutation = useDeleteUser();
  const updateRoleMutation = useUpdateUserRole();

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("STUDENT");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Users local state
  const [userSearch, setUserSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState<string>("");

  // Invitations local state
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.role?.toLowerCase().includes(userSearch.toLowerCase()),
      ),
    [users, userSearch],
  );

  const pendingInvitations = useMemo(() => invitations.filter((i) => i.status === "PENDING"), [invitations]);
  const pastInvitations = useMemo(() => invitations.filter((i) => i.status !== "PENDING"), [invitations]);

  const getRoleBadge = (role: string) => {
    const r = ROLES.find((rl) => rl.value === role);
    return r || { label: role, color: "bg-slate-600/20 text-slate-400 border-slate-500/20" };
  };

  const copyLink = (link: string, id?: string) => {
    navigator.clipboard.writeText(link);
    if (id) {
      setCopiedInviteId(id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } else {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setGeneratedLink("");
    setInviteSuccess("");

    try {
      const res = await inviteMutation.mutateAsync({ email: inviteEmail, role: inviteRole });
      if (res.invitationLink) setGeneratedLink(res.invitationLink);
      setInviteSuccess(res.message || "Invitation sent successfully!");
      setInviteEmail("");
      refetchInvites();
    } catch (err: any) {
      setInviteError(err?.message || "Failed to create invitation");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err?.message || "Failed to delete user");
    }
  };

  const handleDeleteInvitation = async (invId: string) => {
    try {
      await deleteInviteMutation.mutateAsync(invId);
    } catch {
      // silent
    }
  };

  const handleResendInvitation = async (invId: string) => {
    try {
      await resendInviteMutation.mutateAsync(invId);
    } catch {
      // silent
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole });
    } catch (err: any) {
      alert(err?.message || "Failed to update role");
    }
  };

  if (usersLoading && invitesLoading) {
    return <FullPageSpinner label="Loading users…" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-3xl font-black text-white mb-1">User Management</h1>
          <p className="text-slate-400">Invite new users, manage accounts, and track invitations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection("users")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeSection === "users"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" /> Users ({users.length})
          </button>
          <button
            onClick={() => setActiveSection("invite")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeSection === "invite"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Invite
          </button>
          <button
            onClick={() => setActiveSection("invitations")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeSection === "invitations"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" /> Invitations ({pendingInvitations.length})
          </button>
        </div>
      </div>

      {/* Invite Section */}
      {activeSection === "invite" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            Invite New User
          </h2>

          {inviteError && (
            <div className="flex items-center gap-3 p-4 bg-rose-600/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <form onSubmit={handleInvite} className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@email.com"
                  className="w-full bg-surface border border-input rounded-xl py-3 pl-11 pr-4 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Role</label>
              <Dropdown
                trigger={
                  <button
                    type="button"
                    className="w-full bg-surface border border-input rounded-xl py-3 pl-11 pr-10 text-foreground text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all relative flex items-center justify-between"
                  >
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <span>{ROLES.find((r) => r.value === inviteRole)?.label || inviteRole}</span>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </button>
                }
                align="left"
                className="w-full"
                menuClassName="w-full bg-surface border border-border shadow-xl rounded-xl"
              >
                {ROLES.map((r) => (
                  <DropdownItem
                    key={r.value}
                    type="button"
                    onClick={() => setInviteRole(r.value)}
                    className={cn(
                      "justify-start text-sm py-2 px-3",
                      inviteRole === r.value && "bg-surface-muted text-foreground"
                    )}
                  >
                    {r.label}
                  </DropdownItem>
                ))}
              </Dropdown>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Generated link */}
          {(inviteSuccess || generatedLink) && (
            <div className="p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                <Check className="w-4 h-4" /> {inviteSuccess || "Invitation sent!"}
              </div>
              <p className="text-xs text-slate-400">
                Supabase sent an invitation email automatically. You can also copy the link below to share manually.
              </p>
              {generatedLink && (
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-surface border border-input rounded-xl py-2.5 px-4 text-foreground text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
                  />
                  <button
                    onClick={() => copyLink(generatedLink)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                      linkCopied ? "bg-emerald-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users Section */}
      {activeSection === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, email, or role..."
                className="w-full bg-surface border border-input rounded-xl py-3 pl-11 pr-4 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all placeholder:text-muted-foreground"
              />
            </div>
            <Tooltip content="Refresh">
              <RefreshButton
                onClick={() => refetchUsers()}
                isLoading={usersLoading || usersFetching}
              />
            </Tooltip>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : usersError ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
              <p className="text-slate-400">{(usersError as Error)?.message || "Failed to fetch users"}</p>
              <button
                onClick={() => refetchUsers()}
                className="mt-4 px-4 py-2 bg-slate-800 rounded-xl text-white text-sm font-bold hover:bg-slate-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                      <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                      <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joined</th>
                      <th className="text-right p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredUsers.map((u) => {
                      const roleBadge = getRoleBadge(u.role);
                      const isSelf = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 text-sm">
                                {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                  {u.name || "Unknown"}
                                  {isSelf && (
                                    <span className="text-[9px] bg-indigo-600/30 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="text-xs text-slate-500">
                              {u.created_at
                                ? new Date(u.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                                : "-"}
                            </p>
                          </td>
                          <td className="p-4 text-right">
                            {editingRoleUserId === u.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <Dropdown
                                  trigger={
                                    <button
                                      type="button"
                                      className="bg-surface border border-input rounded-lg text-xs py-1.5 pl-3 pr-8 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all relative flex items-center justify-between min-w-[7.5rem] text-left"
                                    >
                                      <span>{ROLES.find((r) => r.value === editingRoleValue)?.label || editingRoleValue}</span>
                                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    </button>
                                  }
                                  align="right"
                                >
                                  {ROLES.map((r) => (
                                    <DropdownItem
                                      key={r.value}
                                      type="button"
                                      onClick={() => setEditingRoleValue(r.value)}
                                      className={cn(
                                        "justify-start text-xs py-1.5 px-3",
                                        editingRoleValue === r.value && "bg-surface-muted text-foreground"
                                      )}
                                    >
                                      {r.label}
                                    </DropdownItem>
                                  ))}
                                </Dropdown>
                                <button
                                  onClick={() => {
                                    handleUpdateRole(u.id, editingRoleValue);
                                    setEditingRoleUserId(null);
                                  }}
                                  disabled={updateRoleMutation.isPending}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                                >
                                  {updateRoleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                </button>
                                <button
                                  onClick={() => setEditingRoleUserId(null)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : deleteConfirmId === u.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs text-rose-400 font-bold">Delete?</span>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={deleteUserMutation.isPending}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all"
                                >
                                  {deleteUserMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <Tooltip content={isSelf ? "Cannot edit your own account" : "Actions"}>
                                <Dropdown
                                  trigger={
                                    <button
                                      disabled={isSelf}
                                      className={`p-2 rounded-lg transition-all ${
                                        isSelf ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-white hover:bg-slate-800"
                                      }`}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  }
                                  align="right"
                                >
                                  <DropdownItem
                                    onClick={() => {
                                      setEditingRoleValue(u.role);
                                      setEditingRoleUserId(u.id);
                                    }}
                                  >
                                    <Shield className="w-3.5 h-3.5" /> Change Role
                                  </DropdownItem>
                                  <DropdownItem
                                    destructive
                                    onClick={() => setDeleteConfirmId(u.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </DropdownItem>
                                </Dropdown>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="p-12 text-center">
                  <UserCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">No users found</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invitations Section */}
      {activeSection === "invitations" && (
        <div className="space-y-6">
          {/* Pending invitations */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Pending ({pendingInvitations.length})
              </h3>
              <Tooltip content="Refresh">
                <RefreshButton
                  onClick={() => refetchInvites()}
                  isLoading={invitesLoading || invitesFetching}
                  className="bg-transparent border-0 p-1 hover:bg-slate-800"
                />
              </Tooltip>
            </div>

            {invitesLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No pending invitations</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {pendingInvitations.map((inv) => {
                  const roleBadge = getRoleBadge(inv.role);
                  const isExpired = new Date(inv.expires_at) < new Date();
                  return (
                    <div key={inv.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{inv.email}</p>
                            <p className="text-xs text-slate-500">
                              Invited by {inv.invited_by_name} &bull; {new Date(inv.created_at).toLocaleDateString()}
                              {isExpired && <span className="text-rose-400 ml-2">EXPIRED</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold border ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                          <Tooltip content="Resend invitation">
                            <button
                              onClick={() => handleResendInvitation(inv.id)}
                              disabled={resendInviteMutation.isPending && resendInviteMutation.variables === inv.id}
                              className={`p-2 rounded-lg text-sm transition-all ${
                                resendInviteMutation.isPending && resendInviteMutation.variables === inv.id
                                  ? "bg-emerald-600/10 text-emerald-400"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {resendInviteMutation.isPending && resendInviteMutation.variables === inv.id ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <RotateCw className="w-4 h-4" />
                              )}
                            </button>
                          </Tooltip>
                          <Tooltip content="Revoke invitation">
                            <button
                              onClick={() => handleDeleteInvitation(inv.id)}
                              disabled={deleteInviteMutation.isPending && deleteInviteMutation.variables === inv.id}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-600/10 transition-all"
                            >
                              {deleteInviteMutation.isPending && deleteInviteMutation.variables === inv.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past invitations */}
          {pastInvitations.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-500" /> Past Invitations ({pastInvitations.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-800/50">
                {pastInvitations.map((inv) => {
                  const roleBadge = getRoleBadge(inv.role);
                  return (
                    <div key={inv.id} className="p-4 opacity-60">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                            <Mail className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">{inv.email}</p>
                            <p className="text-xs text-slate-600">{new Date(inv.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              inv.status === "ACCEPTED"
                                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-600/20 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
