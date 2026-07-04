"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  ChevronRight,
  Send,
  Plus,
  UserPlus,
  X,
  Clock,
  ShieldAlert,
  Loader2,
  Trash2,
  Pin,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { Tooltip } from "@/components/ui/Tooltip";
import { messagesApi } from "@/lib/api/messages";
import { studentsApi } from "@/lib/api/students";
import { mentorsApi } from "@/lib/api/mentors";
import { usersApi } from "@/lib/api/users";
import type { Conversation, Message, AuthUser } from "@/lib/types";

// Type definitions to align with backend models
interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function AdminInboxPage() {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  // State Management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

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
        setSelectedConversationId(null);
      }
      loadConversations(true);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete chat.");
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || !selectedConversationId) return;
    try {
      await messagesApi.rename(selectedConversationId, newGroupName.trim());
      toast.success("Group renamed");
      setIsRenaming(false);
      loadConversations(true);
    } catch (err) {
      console.error("Rename group error:", err);
      toast.error("Failed to rename group.");
    }
  };

  // New Chat Modal States
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<DirectoryUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  // Thread search filter state
  const [threadSearchQuery, setThreadSearchQuery] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Load conversations on mount
  const loadConversations = async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const list = await messagesApi.list();
      setConversations(list);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      if (!silent) toast.error("Failed to load inbox threads.");
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Poll conversations list every 6 seconds
    const interval = setInterval(() => {
      loadConversations(true);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Dynamically lock main page scrolling to enforce independent inner scroll columns
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;

    const originalOverflow = mainEl.style.overflow;
    const originalPaddingBottom = mainEl.style.paddingBottom;
    
    mainEl.style.overflow = "hidden";
    mainEl.style.paddingBottom = "1.5rem"; // Standardize to pb-6

    return () => {
      mainEl.style.overflow = originalOverflow;
      mainEl.style.paddingBottom = originalPaddingBottom;
    };
  }, []);

  // Load directory users for new chat modal
  const loadDirectoryUsers = async () => {
    try {
      const [studentsList, mentorsList, settersList] = await Promise.all([
        studentsApi.list(),
        mentorsApi.list(),
        usersApi.listSetters().catch(() => []),
      ]);

      const merged: DirectoryUser[] = [];

      studentsList.forEach((s) => {
        merged.push({ id: s.id, name: s.name, email: s.email, role: "STUDENT", avatar: s.avatar });
      });
      mentorsList.forEach((m) => {
        merged.push({ id: m.id, name: m.name, email: m.email, role: m.role || "MENTOR", avatar: m.avatar });
      });
      settersList.forEach((set) => {
        merged.push({ id: set.id, name: set.name, email: set.email, role: "SETTER", avatar: set.avatar });
      });

      // Filter out self
      const filtered = merged.filter((u) => u.id !== currentUserId);
      setDirectoryUsers(filtered);
    } catch (err) {
      console.error("Failed to load directory users:", err);
      toast.error("Failed to load recipient directory.");
    }
  };

  useEffect(() => {
    if (isNewChatOpen) {
      loadDirectoryUsers();
    }
  }, [isNewChatOpen]);

  // Load messages when conversation ID changes
  const loadMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const list = await messagesApi.listMessages(convId);
      setMessages(list);

      // Auto mark as read
      await messagesApi.markAsRead(convId).catch(() => { });
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

      // Poll current conversation messages every 3 seconds for realtime feel
      const msgInterval = setInterval(() => {
        loadMessages(selectedConversationId, true);
      }, 3000);

      return () => clearInterval(msgInterval);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle message dispatch
  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedConversationId || sending) return;
    setSending(true);
    const textToSend = replyText;
    setReplyText("");

    try {
      const response = await messagesApi.sendMessage(selectedConversationId, textToSend);
      setMessages((prev) => [...prev, response]);

      // Refresh conversations list to update snippet
      loadConversations(true);
    } catch (err: any) {
      console.error("Send message error:", err);
      toast.error("Failed to dispatch message.");
      setReplyText(textToSend); // restore input
    } finally {
      setSending(false);
    }
  };

  // Create new conversation
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

      // Add to list and select it
      await loadConversations(true);
      setSelectedConversationId(conv.id);

      // Reset modal state
      setIsNewChatOpen(false);
      setSelectedRecipients([]);
      setGroupName("");
      setIsGroup(false);
    } catch (err: any) {
      console.error("Failed to establish chat thread:", err);
      toast.error("Could not initiate conversation.");
    }
  };

  const handleRecipientToggle = (user: DirectoryUser) => {
    if (selectedRecipients.some((r) => r.id === user.id)) {
      setSelectedRecipients((prev) => prev.filter((r) => r.id !== user.id));
    } else {
      setSelectedRecipients((prev) => [...prev, user]);
      if (selectedRecipients.length + 1 > 1) {
        setIsGroup(true);
      }
    }
  };

  // Filters threads list based on search bar queries
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchName = (c.name || "")
        .toLowerCase()
        .includes(threadSearchQuery.toLowerCase());
      const matchParticipants = (c.participants || []).some((p) =>
        p.name.toLowerCase().includes(threadSearchQuery.toLowerCase())
      );
      return matchName || matchParticipants;
    });
  }, [conversations, threadSearchQuery]);

  // Filters user list inside new chat search
  const filteredDirectoryUsers = useMemo(() => {
    return directoryUsers.filter(
      (u) =>
        (u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) &&
        !selectedRecipients.some((r) => r.id === u.id)
    );
  }, [directoryUsers, userSearchQuery, selectedRecipients]);

  const activeConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const displayParticipants = useMemo(() => {
    if (!activeConversation) return [];
    return (activeConversation.participants || []).filter(
      (p) => p.id !== currentUserId
    );
  }, [activeConversation, currentUserId]);

  const chatHeaderTitle = useMemo(() => {
    if (!activeConversation) return "";
    if (activeConversation.is_group) {
      return activeConversation.name || "Group Chat";
    }
    return displayParticipants[0]?.name || "Secure Thread";
  }, [activeConversation, displayParticipants]);

  return (
    <div className="max-w-7xl mx-auto overflow-hidden h-[calc(100vh-7.5rem)]">
      <div className="h-full flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl relative">

        {/* Left Column: Conversations List */}
        <div className="w-80 border-r border-slate-800 flex flex-col min-h-0 bg-slate-950/50 backdrop-blur-xl z-20 shrink-0">
          <div className="p-6 border-b border-slate-800/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white tracking-tight">Inbox</h2>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                placeholder="Search messages..."
                value={threadSearchQuery}
                onChange={(e) => setThreadSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800/80 rounded-2xl py-2.5 pl-11 pr-4 text-xs focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {loadingConv ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Loading threads</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <p className="text-xs">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConversationId;
                const isGroupChat = c.is_group;

                // Get other participant metadata
                const otherParticipant = (c.participants || []).find((p) => p.id !== currentUserId);

                const initials = isGroupChat
                  ? "GP"
                  : otherParticipant?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase() || "??";

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConversationId(c.id)}
                    className={`w-full p-4 flex items-center gap-4 rounded-lg transition-all border border-transparent text-left group cursor-pointer ${isSelected
                      ? "bg-indigo-600/10 border-indigo-500/20"
                      : "hover:bg-slate-900/40"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm overflow-hidden">
                        {!isGroupChat && otherParticipant?.avatar ? (
                          <img
                            src={otherParticipant.avatar}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      {!isGroupChat && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-bold text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                          {c.is_group ? c.name || "Group Chat" : otherParticipant?.name || "Secure DM"}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isGroupChat ? (
                          <span className="text-[8px] font-black text-amber-500/70 border border-amber-500/20 px-1 rounded-sm uppercase tracking-wider">Group</span>
                        ) : (
                          <span className="text-[8px] font-black text-indigo-500/70 border border-indigo-500/20 px-1 rounded-sm uppercase tracking-wider">{otherParticipant?.role}</span>
                        )}
                        <p className="text-xs text-slate-500 truncate">
                          {c.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                    </div>

                    {/* Pin & Delete Hover Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {c.pinned_by?.includes(currentUserId || "") ? (
                        <Tooltip content="Unpin Chat">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleUnpin(c.id);
                            }}
                            className="p-1 hover:bg-slate-800 rounded-md text-amber-400 cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Pin Chat">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handlePin(c.id);
                            }}
                            className="p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}

                      <Tooltip content="Delete Chat">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this conversation?")) {
                              await handleDelete(c.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-950/30 hover:text-rose-500 rounded-md text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Messages View */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900/20 relative z-10">
          {selectedConversationId && activeConversation ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-slate-200 shadow-md">
                    {!activeConversation.is_group && displayParticipants[0]?.avatar ? (
                      <img
                        src={displayParticipants[0].avatar}
                        className="w-full h-full object-cover rounded-full"
                        alt=""
                      />
                    ) : (
                      activeConversation.is_group ? "GP" : displayParticipants[0]?.name[0] || "?"
                    )}
                  </div>
                  <div>
                    {activeConversation.is_group && isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={handleRenameGroup}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsRenaming(false)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {chatHeaderTitle}
                        </h3>
                        {activeConversation.is_group && (
                          <Tooltip content="Rename Group">
                            <button
                              onClick={() => {
                                setNewGroupName(activeConversation.name || "Group Chat");
                                setIsRenaming(true);
                              }}
                              className="text-slate-500 hover:text-white opacity-0 group-hover/title:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {activeConversation.is_group
                        ? `${activeConversation.participant_ids?.length || 0} participants`
                        : displayParticipants[0]?.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div ref={messagesContainerRef} className="flex-1 px-6 py-6 overflow-y-auto custom-scrollbar flex flex-col gap-3 bg-slate-950/10">
                {loadingMsgs ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                    <p className="text-sm">No messages. Type below to say hello!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUserId;
                    const sender = (activeConversation.participants || []).find(
                      (p) => p.id === msg.sender_id
                    );

                    const prevMsg = messages[idx - 1];
                    const isFirstInBlock = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                    const timestampStr = new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3.5 ${isMe ? "justify-end" : "justify-start"
                          }`}
                      >
                        {!isMe && activeConversation.is_group && (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white shrink-0">
                            {sender?.avatar ? (
                              <img src={sender.avatar} className="w-full h-full object-cover rounded-full" alt="" />
                            ) : (
                              sender?.name[0] || "?"
                            )}
                          </div>
                        )}
                        <div className="max-w-[70%] space-y-1">
                          {!isMe && activeConversation.is_group && isFirstInBlock && (
                            <span className="text-[10px] text-slate-500 font-bold ml-1">
                              {sender?.name || "Advisor"}
                            </span>
                          )}
                          <div
                            className={`p-3 rounded-lg text-sm leading-relaxed shadow-sm ${isMe
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10"
                              : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-800/80"
                              }`}
                          >
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                          </div>
                          <p className={`text-[9px] text-slate-600 font-medium ${isMe ? "text-right mr-1" : "ml-1"}`}>
                            {timestampStr}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <div className="px-6 py-4 bg-slate-950/50 backdrop-blur-xl border-t border-slate-800/60">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-full py-3 px-5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!replyText.trim() || sending}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${replyText.trim() && !sending
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center mb-6 shadow-inner">
                <MessageCircle className="w-8 h-8 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Select a conversation</h3>
              <p className="text-slate-500 text-xs max-w-[240px] leading-relaxed">
                Choose a chat partner or group from the list to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Message / Chat Modal */}
      <AnimatePresence>
        {isNewChatOpen && (
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
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">New Conversation</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                      {selectedRecipients.length > 0 ? `${selectedRecipients.length} Selected` : "Select Recipients"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsNewChatOpen(false);
                    setSelectedRecipients([]);
                    setIsGroup(false);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {selectedRecipients.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                      {selectedRecipients.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-1.5 bg-indigo-600/25 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs"
                        >
                          <span className="font-bold text-indigo-300">{user.name}</span>
                          <button
                            onClick={() => handleRecipientToggle(user)}
                            className="text-indigo-400 hover:text-indigo-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {isGroup && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                          Group Chat Name
                        </label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="e.g. Mentor-Student Circle"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-xs focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-slate-700"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleStartNewChat}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black text-xs tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                    >
                      Start Chatting
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name or role..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-11 pr-4 text-xs focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredDirectoryUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleRecipientToggle(user)}
                      className="w-full p-3 flex items-center justify-between hover:bg-indigo-600/10 rounded-lg transition-all text-left border border-transparent hover:border-indigo-500/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            user.name[0]
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{user.name}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                    </button>
                  ))}
                  {filteredDirectoryUsers.length === 0 && (
                    <p className="text-center py-6 text-slate-600 text-xs italic">No users found</p>
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
