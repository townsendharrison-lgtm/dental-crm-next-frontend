"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  Send,
  Plus,
  UserPlus,
  X,
  Loader2,
  Trash2,
  Pencil,
  UserMinus,
  Pin,
  Users,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { Tooltip } from "@/components/ui/Tooltip";
import { messagesApi } from "@/lib/api/messages";
import { studentsApi } from "@/lib/api/students";
import { mentorsApi } from "@/lib/api/mentors";
import { usersApi } from "@/lib/api/users";
import type { Conversation, Message } from "@/lib/types";

export type InboxVariant = "admin" | "mentor" | "student";

type ThreadFilter = "all" | "unread" | "pinned" | "group";

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface InboxViewProps {
  variant: InboxVariant;
  /** When set, opens that thread (from `/messages/[conversationId]`). */
  conversationId?: string | null;
}

const VARIANT_COPY: Record<
  InboxVariant,
  { dmFallback: string; headerFallback: string; groupSubtitle: string }
> = {
  admin: {
    dmFallback: "Secure DM",
    headerFallback: "Secure Thread",
    groupSubtitle: "participants",
  },
  mentor: {
    dmFallback: "Secure Chat",
    headerFallback: "Secure Thread",
    groupSubtitle: "Group Mentorship",
  },
  student: {
    dmFallback: "Advisor Chat",
    headerFallback: "Advisor Chat",
    groupSubtitle: "Mentorship Group",
  },
};

function messagesBasePathFromPathname(pathname: string | null) {
  const match = (pathname || "").match(
    /^(\/(?:admin|mentor-manager|mentor|student)\/messages)/,
  );
  return match?.[1] ?? "/messages";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** WhatsApp-style day labels for chat date separators. */
function formatChatDayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const dayDiff = Math.round((today - target) / 86_400_000);

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function isSameChatDay(a?: string, b?: string) {
  if (!a || !b) return false;
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function InboxView({ variant, conversationId = null }: InboxViewProps) {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const router = useRouter();
  const pathname = usePathname();
  const basePath = messagesBasePathFromPathname(pathname);
  const selectedConversationId = conversationId || null;
  const copy = VARIANT_COPY[variant];
  const isStudent = variant === "student" || currentUser?.role === "STUDENT";
  const canStartConversation = !isStudent;
  const canDeleteConversation = !isStudent;
  const canRenameGroup = !isStudent;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hydratedConversation, setHydratedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<DirectoryUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const invalidRedirected = useRef<string | null>(null);

  const openConversation = (id: string) => {
    router.push(`${basePath}/${id}`);
  };

  const clearConversation = () => {
    router.push(basePath);
  };

  const loadConversations = async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const list = await messagesApi.list();
      setConversations(list);
      return list;
    } catch (err: unknown) {
      console.error("Failed to load conversations:", err);
      if (!silent) toast.error("Failed to load inbox threads.");
      return [] as Conversation[];
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(true), 6000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate thread metadata when URL points at a conversation not yet in the list
  useEffect(() => {
    if (!selectedConversationId) {
      setHydratedConversation(null);
      invalidRedirected.current = null;
      return;
    }

    const fromList = conversations.find((c) => c.id === selectedConversationId);
    if (fromList) {
      setHydratedConversation(fromList);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const conv = await messagesApi.get(selectedConversationId);
        if (cancelled) return;
        setHydratedConversation(conv);
      } catch (err) {
        console.error("Failed to load conversation:", err);
        if (cancelled) return;
        if (invalidRedirected.current === selectedConversationId) return;
        invalidRedirected.current = selectedConversationId;
        toast.error("Could not open that conversation.");
        clearConversation();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId, conversations, basePath]);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    const originalOverflow = mainEl.style.overflow;
    const originalPaddingBottom = mainEl.style.paddingBottom;
    mainEl.style.overflow = "hidden";
    mainEl.style.paddingBottom = "1.5rem";
    return () => {
      mainEl.style.overflow = originalOverflow;
      mainEl.style.paddingBottom = originalPaddingBottom;
    };
  }, []);

  const loadDirectoryUsers = async () => {
    if (!currentUserId) return;
    try {
      let merged: DirectoryUser[] = [];

      if (variant === "admin") {
        const [studentsList, mentorsList, settersList] = await Promise.all([
          studentsApi.list(),
          mentorsApi.list(),
          usersApi.listSetters().catch(() => []),
        ]);
        studentsList.forEach((s) => {
          merged.push({ id: s.id, name: s.name, email: s.email, role: "STUDENT", avatar: s.avatar });
        });
        mentorsList.forEach((m) => {
          merged.push({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role || "MENTOR",
            avatar: m.avatar,
          });
        });
        settersList.forEach((set) => {
          merged.push({
            id: set.id,
            name: set.name,
            email: set.email,
            role: "SETTER",
            avatar: set.avatar,
          });
        });
      } else if (variant === "mentor") {
        const studentsList = await mentorsApi.listStudents(currentUserId).catch(() => []);
        studentsList.forEach((s) => {
          merged.push({
            id: s.id,
            name: s.name,
            email: s.email,
            role: "STUDENT",
            avatar: s.avatar,
          });
        });
        const mentorsList = await mentorsApi.list().catch(() => []);
        mentorsList.forEach((m) => {
          merged.push({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role || "MENTOR",
            avatar: m.avatar,
          });
        });
      } else {
        const studentProfile = await studentsApi.get(currentUserId).catch(() => null);
        const mentorId = studentProfile?.profile?.mentor_id;
        if (mentorId) {
          const mentorDetails = await mentorsApi.get(mentorId).catch(() => null);
          if (mentorDetails) {
            merged.push({
              id: mentorDetails.id,
              name: mentorDetails.name,
              email: mentorDetails.email,
              role: "MENTOR",
              avatar: mentorDetails.avatar,
            });
          }
        }
        const mentorsList = await mentorsApi.list().catch(() => []);
        mentorsList.forEach((m) => {
          if (m.role === "ADMIN" || m.role === "MENTOR_MANAGER") {
            if (!merged.some((u) => u.id === m.id)) {
              merged.push({
                id: m.id,
                name: m.name,
                email: m.email,
                role: m.role,
                avatar: m.avatar,
              });
            }
          }
        });
      }

      const uniqueMap: Record<string, DirectoryUser> = {};
      merged.forEach((u) => {
        if (u.id !== currentUserId) uniqueMap[u.id] = u;
      });
      setDirectoryUsers(Object.values(uniqueMap));
    } catch (err) {
      console.error("Failed to load directory users:", err);
      toast.error("Failed to load recipient directory.");
    }
  };

  useEffect(() => {
    if (isNewChatOpen || isDetailsOpen || isAddMembersOpen) {
      loadDirectoryUsers();
    }
  }, [isNewChatOpen, isDetailsOpen, isAddMembersOpen]);

  const loadMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const list = await messagesApi.listMessages(convId);
      setMessages(list);
      await messagesApi.markAsRead(convId).catch(() => {});
    } catch (err) {
      console.error("Failed to load messages:", err);
      if (!silent) toast.error("Failed to fetch messages.");
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
      const msgInterval = setInterval(() => {
        loadMessages(selectedConversationId, true);
      }, 3000);
      return () => clearInterval(msgInterval);
    }
    setMessages([]);
    setIsDetailsOpen(false);
    setIsAddMembersOpen(false);
  }, [selectedConversationId]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handlePin = async (convId: string) => {
    try {
      await messagesApi.pin(convId);
      toast.success("Chat pinned");
      loadConversations(true);
    } catch (err) {
      console.error("Pin error:", err);
      toast.error("Failed to pin chat.");
    }
  };

  const handleUnpin = async (convId: string) => {
    try {
      await messagesApi.unpin(convId);
      toast.success("Chat unpinned");
      loadConversations(true);
    } catch (err) {
      console.error("Unpin error:", err);
      toast.error("Failed to unpin chat.");
    }
  };

  const handleDelete = async (convId: string) => {
    try {
      await messagesApi.delete(convId);
      toast.success("Chat deleted");
      if (selectedConversationId === convId) {
        setIsDetailsOpen(false);
        clearConversation();
      }
      loadConversations(true);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete chat.");
    }
  };

  const handleRenameGroup = async () => {
    if (!renameDraft.trim() || !selectedConversationId) return;
    try {
      await messagesApi.rename(selectedConversationId, renameDraft.trim());
      toast.success("Group renamed");
      setIsRenaming(false);
      loadConversations(true);
    } catch (err) {
      console.error("Rename group error:", err);
      toast.error("Failed to rename group.");
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedConversationId || memberBusy) return;
    setMemberBusy(true);
    try {
      await messagesApi.addMembers(selectedConversationId, [userId]);
      toast.success("Member added");
      setMemberSearch("");
      await loadConversations(true);
    } catch (err) {
      console.error("Add member error:", err);
      toast.error("Failed to add member.");
    } finally {
      setMemberBusy(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedConversationId || memberBusy) return;
    if (!confirm("Remove this member from the group?")) return;
    setMemberBusy(true);
    try {
      await messagesApi.removeMember(selectedConversationId, memberId);
      toast.success("Member removed");
      await loadConversations(true);
    } catch (err) {
      console.error("Remove member error:", err);
      toast.error("Failed to remove member.");
    } finally {
      setMemberBusy(false);
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedConversationId || sending) return;
    setSending(true);
    const textToSend = replyText;
    setReplyText("");
    try {
      const response = await messagesApi.sendMessage(selectedConversationId, textToSend);
      setMessages((prev) => [...prev, response]);
      loadConversations(true);
    } catch (err) {
      console.error("Send message error:", err);
      toast.error("Failed to dispatch message.");
      setReplyText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async () => {
    if (selectedRecipients.length === 0) return;
    try {
      const participantIds = selectedRecipients.map((r) => r.id);
      const payload = {
        participantIds,
        isGroup: isGroup || selectedRecipients.length > 1,
        name: isGroup ? groupName || "Group Chat" : undefined,
      };
      const conv = await messagesApi.create(payload);
      await loadConversations(true);
      setIsNewChatOpen(false);
      setSelectedRecipients([]);
      setGroupName("");
      setIsGroup(false);
      openConversation(conv.id);
    } catch (err) {
      console.error("Failed to establish chat thread:", err);
      toast.error("Could not initiate conversation.");
    }
  };

  const handleRecipientToggle = (user: DirectoryUser) => {
    if (selectedRecipients.some((r) => r.id === user.id)) {
      setSelectedRecipients((prev) => prev.filter((r) => r.id !== user.id));
    } else {
      setSelectedRecipients((prev) => [...prev, user]);
      if (selectedRecipients.length + 1 > 1) setIsGroup(true);
    }
  };

  const filteredConversations = useMemo(() => {
    const q = threadSearchQuery.toLowerCase();
    return conversations.filter((c) => {
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchParticipants = (c.participants || []).some((p) =>
        p.name.toLowerCase().includes(q)
      );
      if (!(matchName || matchParticipants)) return false;

      const isPinned = !!currentUserId && (c.pinned_by || []).includes(currentUserId);
      if (threadFilter === "unread") return (c.unreadCount || 0) > 0;
      if (threadFilter === "pinned") return isPinned;
      if (threadFilter === "group") return !!c.is_group;
      return true;
    });
  }, [conversations, threadSearchQuery, threadFilter, currentUserId]);

  const filteredDirectoryUsers = useMemo(() => {
    return directoryUsers.filter(
      (u) =>
        (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) &&
        !selectedRecipients.some((r) => r.id === u.id)
    );
  }, [directoryUsers, userSearchQuery, selectedRecipients]);

  const activeConversation =
    conversations.find((c) => c.id === selectedConversationId) ||
    (hydratedConversation?.id === selectedConversationId ? hydratedConversation : null);

  const displayParticipants = useMemo(() => {
    if (!activeConversation) return [];
    return (activeConversation.participants || []).filter((p) => p.id !== currentUserId);
  }, [activeConversation, currentUserId]);

  const chatHeaderTitle = useMemo(() => {
    if (!activeConversation) return "";
    if (activeConversation.is_group) return activeConversation.name || "Group Chat";
    return displayParticipants[0]?.name || copy.headerFallback;
  }, [activeConversation, displayParticipants, copy.headerFallback]);

  const isActivePinned =
    !!currentUserId && !!activeConversation?.pinned_by?.includes(currentUserId);

  const addableMembers = useMemo(() => {
    if (!activeConversation?.is_group) return [];
    const existing = new Set(activeConversation.participant_ids || []);
    const q = memberSearch.toLowerCase();
    return directoryUsers.filter(
      (u) =>
        !existing.has(u.id) &&
        (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
    );
  }, [activeConversation, directoryUsers, memberSearch]);

  const filterPills: { id: ThreadFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "pinned", label: "Pinned" },
    { id: "group", label: "Group" },
  ];

  const openDetails = () => {
    if (!activeConversation) return;
    setRenameDraft(
      activeConversation.is_group
        ? activeConversation.name || "Group Chat"
        : activeConversation.name || ""
    );
    setIsRenaming(false);
    setMemberSearch("");
    setIsAddMembersOpen(false);
    setIsDetailsOpen((open) => !open);
  };

  return (
    <div className="max-w-7xl mx-auto overflow-hidden h-[calc(100vh-7.5rem)]">
      <div className="h-full flex bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative">
        {/* Left: thread list */}
        <div className="w-[300px] border-r border-slate-800/80 flex flex-col min-h-0 bg-slate-950 z-20 shrink-0">
          <div className="px-4 pt-4 pb-3 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">Inbox</h2>
              {canStartConversation && (
                <button
                  type="button"
                  onClick={() => setIsNewChatOpen(true)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                  aria-label="New conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search"
                value={threadSearchQuery}
                onChange={(e) => setThreadSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-slate-600 transition-colors text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex p-0.5 rounded-full bg-slate-900 border border-slate-800">
              {filterPills.map((pill) => {
                const active = threadFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setThreadFilter(pill.id)}
                    className={`flex-1 min-w-0 px-1.5 py-1.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingConv ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                <p className="text-slate-500 text-xs">Loading…</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-16 px-4 text-slate-500">
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConversationId;
                const isGroupChat = c.is_group;
                const isPinned = !!currentUserId && (c.pinned_by || []).includes(currentUserId);
                const otherParticipant = (c.participants || []).find((p) => p.id !== currentUserId);
                const initials = isGroupChat
                  ? "G"
                  : otherParticipant?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase() || "?";
                const unread = c.unreadCount || 0;

                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openConversation(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openConversation(c.id);
                      }
                    }}
                    className={`w-full px-3 py-2.5 flex items-start gap-3 text-left group cursor-pointer border-l-2 transition-colors ${
                      isSelected
                        ? "bg-indigo-500/10 border-l-indigo-500"
                        : "border-l-transparent hover:bg-slate-900/60"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0 ${
                        isGroupChat
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {!isGroupChat && otherParticipant?.avatar ? (
                        <img
                          src={otherParticipant.avatar}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : isGroupChat ? (
                        <Users className="w-4 h-4 text-slate-400" />
                      ) : (
                        initials
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {isPinned && (
                          <Pin
                            className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0"
                            aria-label="Pinned"
                          />
                        )}
                        <h4
                          className={`text-sm truncate flex-1 ${
                            unread > 0 ? "font-semibold text-white" : "font-medium text-slate-200"
                          }`}
                        >
                          {c.is_group
                            ? c.name || "Group Chat"
                            : otherParticipant?.name || copy.dmFallback}
                        </h4>
                        {unread > 0 && (
                          <span className="shrink-0 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-indigo-500 text-[10px] font-semibold text-white flex items-center justify-center">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-500 truncate mt-0.5">
                        {isGroupChat ? (
                          <span className="text-slate-400">Group · </span>
                        ) : null}
                        {c.lastMessage?.text || "No messages yet"}
                      </p>
                    </div>

                    <Tooltip content={isPinned ? "Unpin" : "Pin"}>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isPinned) await handleUnpin(c.id);
                          else await handlePin(c.id);
                        }}
                        className={`mt-0.5 p-1.5 rounded-md transition-all cursor-pointer shrink-0 ${
                          isPinned
                            ? "text-amber-400 opacity-100"
                            : "text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                        aria-label={isPinned ? "Unpin chat" : "Pin chat"}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                      </button>
                    </Tooltip>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center: messages */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40 relative z-10 min-w-0">
          {selectedConversationId && activeConversation ? (
            <>
              <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-200 shrink-0 overflow-hidden">
                    {!activeConversation.is_group && displayParticipants[0]?.avatar ? (
                      <img
                        src={displayParticipants[0].avatar}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : activeConversation.is_group ? (
                      <Users className="w-4 h-4 text-slate-400" />
                    ) : (
                      displayParticipants[0]?.name?.[0] || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isActivePinned && (
                        <Pin className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-white truncate">
                        {chatHeaderTitle}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {activeConversation.is_group
                        ? `${activeConversation.participant_ids?.length || 0} members`
                        : displayParticipants[0]?.role?.replace(/_/g, " ") || "Conversation"}
                    </p>
                  </div>
                </div>

                <Tooltip content="Details">
                  <button
                    type="button"
                    onClick={openDetails}
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      isDetailsOpen
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                        : "border-slate-800 bg-transparent text-slate-400 hover:text-white hover:border-slate-600"
                    }`}
                    aria-label="Conversation details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              <div
                ref={messagesContainerRef}
                className="flex-1 px-5 py-5 overflow-y-auto custom-scrollbar flex flex-col gap-2.5"
              >
                {loadingMsgs ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <p className="text-sm">No messages yet. Say hello.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUserId;
                    const sender = (activeConversation.participants || []).find(
                      (p) => p.id === msg.sender_id
                    );
                    const prevMsg = messages[idx - 1];
                    const isFirstInBlock = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                    const showDaySeparator = !prevMsg || !isSameChatDay(prevMsg.created_at, msg.created_at);
                    const dayLabel = showDaySeparator ? formatChatDayLabel(msg.created_at) : "";
                    const timestampStr = new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <React.Fragment key={msg.id}>
                        {showDaySeparator && dayLabel && (
                          <div className="flex justify-center my-3">
                            <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-medium text-slate-400 shadow-sm">
                              {dayLabel}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${
                            isFirstInBlock && !showDaySeparator ? "mt-2" : ""
                          }`}
                        >
                          {!isMe && activeConversation.is_group && (
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 shrink-0 overflow-hidden mb-4">
                              {sender?.avatar ? (
                                <img
                                  src={sender.avatar}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                sender?.name?.[0] || "?"
                              )}
                            </div>
                          )}
                          <div
                            className={`max-w-[72%] space-y-1 ${isMe ? "items-end" : "items-start"}`}
                          >
                            {!isMe && activeConversation.is_group && isFirstInBlock && (
                              <span className="text-[11px] text-slate-500 font-medium ml-1">
                                {sender?.name || "Member"}
                              </span>
                            )}
                            <div
                              className={`px-3.5 py-2 text-sm leading-relaxed ${
                                isMe
                                  ? "bg-indigo-600 text-white rounded-2xl rounded-br-md"
                                  : "bg-slate-800 text-slate-100 rounded-2xl rounded-bl-md"
                              }`}
                            >
                              <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                            </div>
                            <p
                              className={`text-[10px] text-slate-600 ${
                                isMe ? "text-right pr-1" : "pl-1"
                              }`}
                            >
                              {timestampStr}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Write a message…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-slate-600 transition-colors text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!replyText.trim() || sending}
                    className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      replyText.trim() && !sending
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "bg-slate-800 text-slate-600"
                    }`}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : selectedConversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-slate-500 text-sm">Opening conversation…</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Select a conversation</h3>
              <p className="text-slate-500 text-sm max-w-[220px]">
                Pick a thread from the left to start messaging.
              </p>
            </div>
          )}
        </div>

        {/* Details sidebar — shrinks conversation */}
        <AnimatePresence initial={false}>
          {isDetailsOpen && activeConversation && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="border-l border-slate-800 bg-slate-950 shrink-0 overflow-hidden h-full"
            >
              <div className="w-[300px] h-full flex flex-col">
                <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
                  <p className="text-sm font-semibold text-white">Details</p>
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                  {/* Name */}
                  <div className="flex flex-col items-center text-center gap-3 pt-1">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-lg font-semibold text-slate-200 overflow-hidden">
                      {!activeConversation.is_group && displayParticipants[0]?.avatar ? (
                        <img
                          src={displayParticipants[0].avatar}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : activeConversation.is_group ? (
                        <Users className="w-7 h-7 text-slate-400" />
                      ) : (
                        displayParticipants[0]?.name?.[0] || "?"
                      )}
                    </div>

                    {activeConversation.is_group ? (
                      canRenameGroup && isRenaming ? (
                        <div className="w-full space-y-2">
                          <input
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white text-center focus:outline-none focus:border-slate-600"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleRenameGroup()}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleRenameGroup}
                              className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsRenaming(false);
                                setRenameDraft(activeConversation.name || "Group Chat");
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : canRenameGroup ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRenameDraft(activeConversation.name || "Group Chat");
                            setIsRenaming(true);
                          }}
                          className="group inline-flex items-center gap-1.5 max-w-full cursor-pointer"
                        >
                          <span className="text-base font-semibold text-white truncate">
                            {activeConversation.name || "Group Chat"}
                          </span>
                          <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                        </button>
                      ) : (
                        <p className="text-base font-semibold text-white truncate px-2">
                          {activeConversation.name || "Group Chat"}
                        </p>
                      )
                    ) : (
                      <div>
                        <p className="text-base font-semibold text-white truncate px-2">
                          {chatHeaderTitle}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {displayParticipants[0]?.role?.replace(/_/g, " ") || "Direct message"}
                        </p>
                      </div>
                    )}

                    {activeConversation.is_group && !isRenaming && (
                      <p className="text-xs text-slate-500 -mt-1">
                        {activeConversation.participant_ids?.length || 0} members
                      </p>
                    )}
                  </div>

                  {/* Members */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      Members · {activeConversation.participant_ids?.length || 0}
                    </p>
                    <div className="space-y-0.5">
                      {(activeConversation.participants || []).map((p) => {
                        const isSelf = p.id === currentUserId;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-900/70"
                          >
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-semibold text-slate-300 overflow-hidden shrink-0">
                              {p.avatar ? (
                                <img
                                  src={p.avatar}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                p.name?.[0] || "?"
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-200 truncate">
                                {p.name}
                                {isSelf ? " · You" : ""}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {(p.role || "").replace(/_/g, " ")}
                                {p.email ? ` · ${p.email}` : ""}
                              </p>
                            </div>
                            {activeConversation.is_group && !isSelf && (
                              <Tooltip content="Remove">
                                <button
                                  type="button"
                                  disabled={memberBusy}
                                  onClick={() => handleRemoveMember(p.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer disabled:opacity-50"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
                  {activeConversation.is_group && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSearch("");
                        setIsAddMembersOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2.5 text-sm font-medium text-white cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add members
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (isActivePinned) await handleUnpin(activeConversation.id);
                      else await handlePin(activeConversation.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 cursor-pointer"
                  >
                    <Pin
                      className={`w-4 h-4 ${
                        isActivePinned ? "text-amber-400 fill-amber-400" : "text-slate-400"
                      }`}
                    />
                    {isActivePinned ? "Unpin" : "Pin"}
                  </button>
                  {canDeleteConversation && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Delete this conversation?")) {
                          await handleDelete(activeConversation.id);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-900/30 px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Add members popup */}
      <AnimatePresence>
        {isAddMembersOpen && activeConversation?.is_group && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMembersOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Add members</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search and add people to this group
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMembersOpen(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-slate-600 placeholder:text-slate-500"
                  />
                </div>
                <div className="max-h-[280px] overflow-y-auto space-y-0.5 custom-scrollbar">
                  {addableMembers.length === 0 ? (
                    <p className="text-sm text-slate-500 py-8 text-center">
                      No matching people to add
                    </p>
                  ) : (
                    addableMembers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        disabled={memberBusy}
                        onClick={() => handleAddMember(u.id)}
                        className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-slate-900 cursor-pointer disabled:opacity-50"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300 overflow-hidden shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            u.name[0]
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {u.role}
                            {u.email ? ` · ${u.email}` : ""}
                          </p>
                        </div>
                        {memberBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                        ) : (
                          <Plus className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New chat modal */}
      <AnimatePresence>
        {isNewChatOpen && canStartConversation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewChatOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-950 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/15 flex items-center justify-center text-indigo-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">New conversation</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedRecipients.length > 0
                        ? `${selectedRecipients.length} selected`
                        : "Choose people to message"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewChatOpen(false);
                    setSelectedRecipients([]);
                    setIsGroup(false);
                  }}
                  className="h-8 w-8 inline-flex items-center justify-center hover:bg-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {selectedRecipients.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                      {selectedRecipients.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-xs"
                        >
                          <span className="font-medium text-slate-200">{user.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRecipientToggle(user)}
                            className="text-slate-500 hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {isGroup && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Group name</label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="e.g. Mentor-Student Circle"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-slate-600 text-white placeholder:text-slate-600"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                    >
                      Start chatting
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                  {filteredDirectoryUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleRecipientToggle(user)}
                      className="w-full p-2.5 flex items-center justify-between hover:bg-slate-900 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300 overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            user.name[0]
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{user.name}</p>
                          <p className="text-[11px] text-slate-500">{user.role}</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  ))}
                  {filteredDirectoryUsers.length === 0 && (
                    <p className="text-center py-6 text-slate-600 text-sm">No users found</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InboxPageShell({
  variant,
  conversationId = null,
}: InboxViewProps) {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <InboxView variant={variant} conversationId={conversationId} />
    </React.Suspense>
  );
}
