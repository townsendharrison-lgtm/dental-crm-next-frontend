"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Tooltip } from "@/components/ui/Tooltip";
import { Input, Textarea, Select } from "@/components/ui/Form";
import { useRouter } from "next/navigation";
import {
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  DollarSign,
  Search,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  ChevronLeft,
  Award,
  Target,
  TrendingUp,
  ShoppingBag,
  AlertCircle,
  Calendar,
  Mail,
  Settings,
  Save,
  Info,
  Globe,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type {
  Lead,
  UserRole,
  SetterUser,
  LeadMeeting,
  LeadMeetingType,
  EmailSettings,
  LeadEmailTemplate,
} from "@/lib/types";

interface SetterDetailViewProps {
  setterId: string;
  setter: SetterUser;
  leads: Lead[];
  setters: SetterUser[];
  userRole: UserRole;
  onAddLead: (lead: Omit<Lead, "id" | "createdAt" | "showedUp" | "isPaid" | "setterId">) => void;
  onUpdateLeadStatus?: (leadId: string, updates: Partial<Lead>) => void;
  onDeleteLead?: (leadId: string) => void;
  onDeleteSetter?: (setterId: string) => void;
  onScheduleMeeting: (leadId: string, meeting: Omit<LeadMeeting, "id" | "status" | "emailsSent">) => void;
  emailSettings: EmailSettings;
  onUpdateEmailTemplate: (templateId: string, updates: Partial<LeadEmailTemplate>) => void;
  onUpdateSetterGoal?: (setterId: string, updates: { weeklyLeadGoal?: number; monthlyLeadGoal?: number }) => void;
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b"];

const PURCHASE_OPTIONS = [
  "mentorship",
  "essay editing",
  "school selection",
  "suturing course",
  "virtual shadowing",
  "interview prep",
];

export const SetterDetailView: React.FC<SetterDetailViewProps> = ({
  setterId,
  setter,
  leads,
  setters,
  userRole,
  onAddLead,
  onUpdateLeadStatus,
  onDeleteLead,
  onDeleteSetter,
  onScheduleMeeting,
  emailSettings,
  onUpdateEmailTemplate,
  onUpdateSetterGoal,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"leads" | "analytics" | "meetings">("leads");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<"6m" | "12m">("6m");
  const [velocityView, setVelocityView] = useState<"weekly" | "monthly">("monthly");
  const [goalInput, setGoalInput] = useState<string>("");
  const [isEditingGoal, setIsEditingGoal] = useState<"weekly" | "monthly" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "lead" | "setter"; id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [meetingForm, setMeetingForm] = useState({
    type: "Strategy Session" as LeadMeetingType,
    date: "",
    time: "12:00",
    ampm: "PM" as "AM" | "PM",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Facebook" as Lead["source"],
    notes: "",
    adminNotes: "",
    contacted: false,
    isPaid: false,
    purchasedItems: [] as string[],
    purchaseTotal: 0,
  });

  const [customSource, setCustomSource] = useState("");
  const [celebratedMilestones, setCelebratedMilestones] = useState<number[]>([]);
  const [showCelebration, setShowCelebration] = useState<{ count: number } | null>(null);

  const isAdmin = userRole === "ADMIN";

  // Filter leads specifically for this setter
  const baseLeads = useMemo(() => {
    return leads.filter((l) => l.setterId === setterId);
  }, [leads, setterId]);

  // Milestone Celebration logic
  useEffect(() => {
    if (isAdmin) return;
    const count = baseLeads.length;
    const milestones = [50, 100];
    const milestoneToCelebrate = milestones.find((m) => count === m && !celebratedMilestones.includes(m));

    if (milestoneToCelebrate) {
      setShowCelebration({ count: milestoneToCelebrate });
      setCelebratedMilestones((prev) => [...prev, milestoneToCelebrate]);

      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [baseLeads.length, celebratedMilestones, isAdmin]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredLeads = useMemo(() => {
    return baseLeads
      .filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.phone && lead.phone.includes(searchTerm)),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [baseLeads, searchTerm]);

  // Client-side pagination variables
  const pageSize = 10;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredLeads.length / pageSize)), [filteredLeads.length]);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, currentPage]);

  const pageRange = useMemo(() => {
    const range: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      if (currentPage <= 3) {
        range.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        range.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        range.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return range;
  }, [currentPage, totalPages]);

  const weeklyLeadsCount = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return baseLeads.filter((lead) => new Date(lead.createdAt) >= startOfWeek).length;
  }, [baseLeads]);

  const monthlyLeadsCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return baseLeads.filter((lead) => new Date(lead.createdAt) >= startOfMonth).length;
  }, [baseLeads]);

  const performanceMetrics = useMemo(() => {
    const showUpLeads = baseLeads.filter((l) => l.showedUp);
    const purchaseLeads = showUpLeads.filter(
      (l) => (l.purchaseTotal || 0) > 0 || (l.purchasedItems && l.purchasedItems.length > 0),
    );
    const closeRatio = showUpLeads.length > 0 ? (purchaseLeads.length / showUpLeads.length) * 100 : 0;
    const totalRevenue = baseLeads.reduce((sum, l) => sum + (l.purchaseTotal || 0), 0);
    const avgRevenuePerShowUp = showUpLeads.length > 0 ? totalRevenue / showUpLeads.length : 0;
    return {
      showUpCount: showUpLeads.length,
      purchaseCount: purchaseLeads.length,
      closeRatio,
      totalRevenue,
      avgRevenuePerShowUp,
    };
  }, [baseLeads]);

  const analyticsData = useMemo(() => {
    const sources: Record<string, number> = {};
    const monthlyChart: { name: string; value: number; sales: number }[] = [];
    const weeklyChart: { name: string; value: number; sales: number }[] = [];

    const limit = timeRange === "6m" ? 6 : 12;
    const now = new Date();

    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const name = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlyChart.push({ name, value: 0, sales: 0 });
    }

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day;
      const startOfWeek = new Date(d.setDate(diff));
      const name = `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()}`;
      weeklyChart.push({ name, value: 0, sales: 0 });
    }

    baseLeads.forEach((lead) => {
      const date = new Date(lead.createdAt);
      const monthName = date.toLocaleString("default", { month: "short", year: "2-digit" });
      const monthlyItem = monthlyChart.find((item) => item.name === monthName);
      if (monthlyItem) {
        monthlyItem.value++;
        monthlyItem.sales += lead.purchaseTotal || 0;
      }

      const day = date.getDay();
      const diff = date.getDate() - day;
      const startOfWeek = new Date(new Date(lead.createdAt).setDate(diff));
      const weekName = `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()}`;
      const weeklyItem = weeklyChart.find((item) => item.name === weekName);
      if (weeklyItem) {
        weeklyItem.value++;
        weeklyItem.sales += lead.purchaseTotal || 0;
      }

      sources[lead.source] = (sources[lead.source] || 0) + 1;
    });

    const sourceChart = Object.entries(sources).map(([name, value]) => ({ name, value }));

    return { monthlyChart, weeklyChart, sourceChart };
  }, [baseLeads, timeRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLead = {
      ...newLead,
      source: newLead.source === "Other" ? customSource : newLead.source,
    };
    if (editingLeadId) {
      onUpdateLeadStatus?.(editingLeadId, finalLead);
      setEditingLeadId(null);
    } else {
      onAddLead(finalLead);
    }
    setNewLead({
      name: "",
      phone: "",
      email: "",
      source: "Facebook",
      notes: "",
      adminNotes: "",
      contacted: false,
      isPaid: false,
      purchasedItems: [],
      purchaseTotal: 0,
    });
    setCustomSource("");
    setShowAddModal(false);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showScheduleModal) {
      let [hours, minutes] = meetingForm.time.split(":").map(Number);
      if (meetingForm.ampm === "PM" && hours < 12) hours += 12;
      if (meetingForm.ampm === "AM" && hours === 12) hours = 0;

      const [year, month, day] = meetingForm.date.split("-").map(Number);
      const date = new Date(year, month - 1, day, hours, minutes);

      onScheduleMeeting(showScheduleModal.leadId, {
        leadId: showScheduleModal.leadId,
        type: meetingForm.type,
        startTime: date.toISOString(),
        timezone: meetingForm.timezone,
      });
      setShowScheduleModal(null);
      setMeetingForm({
        type: "Strategy Session",
        date: "",
        time: "12:00",
        ampm: "PM",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  };

  const allMeetings = useMemo(() => {
    return baseLeads
      .flatMap((l) => (l.meetings || []).map((m) => ({ ...m, leadName: l.name })))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [baseLeads]);

  const handleEditClick = (lead: Lead) => {
    const isStandardSource = ["Facebook", "Instagram", "Reddit"].includes(lead.source);
    setNewLead({
      name: lead.name,
      phone: lead.phone || "",
      email: lead.email || "",
      source: isStandardSource ? lead.source : "Other",
      notes: lead.notes || "",
      adminNotes: lead.adminNotes || "",
      contacted: lead.contacted,
      isPaid: lead.isPaid,
      purchasedItems: lead.purchasedItems || [],
      purchaseTotal: lead.purchaseTotal || 0,
    });
    setCustomSource(isStandardSource ? "" : lead.source);
    setEditingLeadId(lead.id);
    setShowAddModal(true);
  };

  const togglePurchasedItem = (item: string) => {
    setNewLead((prev) => {
      const items = prev.purchasedItems.includes(item)
        ? prev.purchasedItems.filter((i) => i !== item)
        : [...prev.purchasedItems, item];
      return { ...prev, purchasedItems: items };
    });
  };

  const handleBackClick = () => {
    router.push("/admin/setter-management");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button
              onClick={handleBackClick}
              className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {setter.name}&apos;s Leads
            </h1>
            <p className="text-slate-400 text-sm hidden sm:block">Track and manage sales leads for this setter</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "leads" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Leads
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "analytics" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-2" />
            Analytics
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("meetings")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "meetings" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Meetings
            </button>
          )}
        </div>
      </div>

      {/* Redesigned 5-Column Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Leads */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Leads</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">{baseLeads.length}</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Leads in vault</div>
          </div>
        </div>

        {/* Card 2: Close Ratio */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Close Ratio</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">{performanceMetrics.closeRatio.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
              {performanceMetrics.purchaseCount} / {performanceMetrics.showUpCount} Showed Up
            </div>
          </div>
        </div>

        {/* Card 3: Avg Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Revenue</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">
              ${Math.round(performanceMetrics.avgRevenuePerShowUp).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
              Total: ${performanceMetrics.totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Weekly Goal */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weekly Goal</span>
            </div>
            <button
              onClick={() => {
                setGoalInput(setter?.weeklyLeadGoal?.toString() || "0");
                setIsEditingGoal("weekly");
              }}
              className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-white">{weeklyLeadsCount}</div>
              <div className="text-xs text-slate-500">/ {setter?.weeklyLeadGoal || 0}</div>
            </div>
            {setter?.weeklyLeadGoal ? (
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weeklyLeadsCount / (setter?.weeklyLeadGoal || 1)) * 100, 100)}%` }}
                  className="h-full bg-indigo-600"
                />
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">No goal configured</div>
            )}
          </div>

          {isEditingGoal === "weekly" && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-xl p-5 flex flex-col justify-center z-10 border border-indigo-500/30">
              <label className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Weekly Goal</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  autoFocus
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const goal = parseInt(goalInput);
                      if (!isNaN(goal) && onUpdateSetterGoal) {
                        onUpdateSetterGoal(setterId, { weeklyLeadGoal: goal });
                      }
                      setIsEditingGoal(null);
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800"
                />
                <button
                  onClick={() => {
                    const goal = parseInt(goalInput);
                    if (!isNaN(goal) && onUpdateSetterGoal) {
                      onUpdateSetterGoal(setterId, { weeklyLeadGoal: goal });
                    }
                    setIsEditingGoal(null);
                  }}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
              <button
                onClick={() => setIsEditingGoal(null)}
                className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 font-bold transition-colors text-left cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Card 5: Monthly Goal */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Goal</span>
            </div>
            <button
              onClick={() => {
                setGoalInput(setter?.monthlyLeadGoal?.toString() || "0");
                setIsEditingGoal("monthly");
              }}
              className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-white">{monthlyLeadsCount}</div>
              <div className="text-xs text-slate-500">/ {setter?.monthlyLeadGoal || 0}</div>
            </div>
            {setter?.monthlyLeadGoal ? (
              <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((monthlyLeadsCount / (setter?.monthlyLeadGoal || 1)) * 100, 100)}%` }}
                  className="h-full bg-emerald-600"
                />
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">No goal configured</div>
            )}
          </div>

          {isEditingGoal === "monthly" && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-xl p-5 flex flex-col justify-center z-10 border border-emerald-500/30">
              <label className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Monthly Goal</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  autoFocus
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const goal = parseInt(goalInput);
                      if (!isNaN(goal) && onUpdateSetterGoal) {
                        onUpdateSetterGoal(setterId, { monthlyLeadGoal: goal });
                      }
                      setIsEditingGoal(null);
                    }
                  }}
                  className="flex-1 bg-slate-950 border-slate-800 focus-visible:ring-emerald-500"
                />
                <button
                  onClick={() => {
                    const goal = parseInt(goalInput);
                    if (!isNaN(goal) && onUpdateSetterGoal) {
                      onUpdateSetterGoal(setterId, { monthlyLeadGoal: goal });
                    }
                    setIsEditingGoal(null);
                  }}
                  className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500 transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
              <button
                onClick={() => setIsEditingGoal(null)}
                className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 font-bold transition-colors text-left cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === "leads" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-800"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead Info</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Added</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Contacted</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Showed Up/Qualified</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Paid</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.email || "No email"}</div>
                        <div className="text-xs text-slate-500">{lead.phone || "No phone"}</div>
                        {lead.notes && (
                          <div className="mt-1 text-[10px] text-slate-500 italic truncate max-w-[200px]">&quot;{lead.notes}&quot;</div>
                        )}
                        {isAdmin && lead.adminNotes && (
                          <div className="mt-2 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded text-[10px] text-indigo-300 max-w-[200px]">
                            <span className="font-bold uppercase text-[8px] block mb-0.5 opacity-50">Admin Note:</span>
                            {lead.adminNotes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            lead.source === "Facebook"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : lead.source === "Instagram"
                              ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}
                        >
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {isAdmin ? (
                            <Tooltip content={lead.contacted ? "Mark as Not Contacted" : "Mark as Contacted"}>
                              <button
                                onClick={() => onUpdateLeadStatus?.(lead.id, { contacted: !lead.contacted })}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  lead.contacted ? "text-indigo-400 hover:bg-indigo-500/10" : "text-slate-600 hover:bg-slate-800"
                                }`}
                              >
                                <CheckCircle2 className="w-6 h-6" />
                              </button>
                            </Tooltip>
                          ) : lead.contacted ? (
                            <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-slate-700" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {isAdmin ? (
                            <div className="flex items-center gap-1">
                              <Tooltip content="Mark as Qualified / Showed Up">
                                <button
                                  onClick={() => onUpdateLeadStatus?.(lead.id, { showedUp: lead.showedUp === true ? null : true })}
                                  className={`p-1 rounded-md transition-all cursor-pointer ${
                                    lead.showedUp === true
                                      ? "text-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20"
                                      : "text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10"
                                  }`}
                                >
                                  <CheckCircle2 className="w-6 h-6" />
                                </button>
                              </Tooltip>
                              <Tooltip content="Mark as Disqualified / No Show">
                                <button
                                  onClick={() => onUpdateLeadStatus?.(lead.id, { showedUp: lead.showedUp === false ? null : false })}
                                  className={`p-1 rounded-md transition-all cursor-pointer ${
                                    lead.showedUp === false
                                      ? "text-rose-400 bg-rose-500/20 shadow-lg shadow-rose-500/20"
                                      : "text-slate-600 hover:text-rose-400 hover:bg-rose-500/10"
                                  }`}
                                >
                                  <XCircle className="w-6 h-6" />
                                </button>
                              </Tooltip>
                            </div>
                          ) : lead.showedUp === true ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : lead.showedUp === false ? (
                            <XCircle className="w-6 h-6 text-rose-400" />
                          ) : (
                            <Tooltip content="Pending Status">
                              <div className="w-6 h-6 border-2 border-dashed border-slate-800 rounded-full" />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          {isAdmin ? (
                            <Tooltip content={lead.isPaid ? "Mark as Unpaid" : "Mark as Paid"}>
                              <button
                                onClick={() => onUpdateLeadStatus?.(lead.id, { isPaid: !lead.isPaid })}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  lead.isPaid ? "text-indigo-400 hover:bg-indigo-500/10" : "text-slate-600 hover:bg-slate-800"
                                }`}
                              >
                                <DollarSign className="w-6 h-6" />
                              </button>
                            </Tooltip>
                          ) : (
                            <div className={`p-1 ${lead.isPaid ? "text-indigo-400" : "text-slate-700"}`}>
                              <DollarSign className="w-6 h-6" />
                            </div>
                          )}
                          {isAdmin && (
                            <div className="flex flex-col items-center">
                              {lead.purchaseTotal !== undefined && lead.purchaseTotal > 0 && (
                                <div className="text-[10px] font-bold text-emerald-400">${lead.purchaseTotal.toLocaleString()}</div>
                              )}
                              {lead.purchasedItems && lead.purchasedItems.length > 0 && (
                                <Tooltip content={lead.purchasedItems.join(", ")}>
                                  <div className="text-[9px] text-slate-500 max-w-[120px] text-center leading-tight line-clamp-2 cursor-default">
                                    {lead.purchasedItems.join(", ")}
                                  </div>
                                </Tooltip>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          {isAdmin && (
                            <Tooltip content="Schedule Meeting">
                              <button
                                onClick={() => setShowScheduleModal({ leadId: lead.id, leadName: lead.name })}
                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all relative z-10 cursor-pointer"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip content="Edit Lead">
                            <button
                              onClick={() => handleEditClick(lead)}
                              className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all relative z-10 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Delete Lead">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete({ type: "lead", id: lead.id, name: lead.name });
                              }}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all relative z-10 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No leads found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/30">
                <div className="text-xs text-slate-400">
                  Showing <span className="font-bold text-white">{Math.min((currentPage - 1) * pageSize + 1, filteredLeads.length)}</span> to{" "}
                  <span className="font-bold text-white">{Math.min(currentPage * pageSize, filteredLeads.length)}</span> of{" "}
                  <span className="font-bold text-white">{filteredLeads.length}</span> leads
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed border border-slate-700"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {pageRange.map((page, idx) => {
                      if (page === "...") {
                        return (
                          <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-500 font-bold">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(Number(page))}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed border border-slate-700"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "meetings" && isAdmin ? (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Scheduled Meetings</h3>
                <p className="text-sm text-slate-400">View and manage upcoming strategy sessions and follow-ups</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date &amp; Time</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reminders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {allMeetings.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">{meeting.leadName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            meeting.type === "Strategy Session"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {meeting.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{new Date(meeting.startTime).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            meeting.status === "Scheduled"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : meeting.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {meeting.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {["24h_before", "1h_before", "1d_after", "3d_after"].map((trigger) => {
                            const sent = meeting.emailsSent.includes(trigger);
                            return (
                              <Tooltip key={trigger} content={trigger.replace("_", " ")}>
                                <div className={`w-2 h-2 rounded-full ${sent ? "bg-emerald-500" : "bg-slate-700"}`} />
                              </Tooltip>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allMeetings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No meetings scheduled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-xl shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Lead Velocity</h3>
                  <p className="text-xs text-slate-500">Number of leads over time</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setVelocityView("weekly")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        velocityView === "weekly" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setVelocityView("monthly")}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                        velocityView === "monthly" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                  {velocityView === "monthly" && (
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setTimeRange("6m")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          timeRange === "6m" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        6M
                      </button>
                      <button
                        onClick={() => setTimeRange("12m")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          timeRange === "12m" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        12M
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityView === "monthly" ? analyticsData.monthlyChart : analyticsData.weeklyChart} margin={{ bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickMargin={12}
                      interval={0}
                      angle={timeRange === "12m" && velocityView === "monthly" ? -45 : 0}
                      textAnchor={timeRange === "12m" && velocityView === "monthly" ? "end" : "middle"}
                      height={timeRange === "12m" && velocityView === "monthly" ? 70 : 45}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#f8fafc" }} itemStyle={{ color: "#818cf8" }} />
                    <Bar name="Leads" dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-xl shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Sales Trend</h3>
                  <p className="text-xs text-slate-500">Revenue generated over time</p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.monthlyChart} margin={{ bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickMargin={12}
                      interval={0}
                      angle={timeRange === "12m" ? -45 : 0}
                      textAnchor={timeRange === "12m" ? "end" : "middle"}
                      height={timeRange === "12m" ? 70 : 45}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#f8fafc" }} itemStyle={{ color: "#10b981" }} />
                    <Bar name="Sales ($)" dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-xl shadow-xl col-span-1 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-6">Lead Sources</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={analyticsData.sourceChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {analyticsData.sourceChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155", color: "#f8fafc" }} itemStyle={{ color: "#f8fafc" }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: "#94a3b8" }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Celebrations */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 50 }}
              className="bg-slate-900 border-2 border-indigo-500 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.3)] w-full max-w-md overflow-hidden text-center p-8 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              <div className="mb-6 inline-flex p-4 bg-indigo-500/20 rounded-full">
                <Award className="w-12 h-12 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Incredible Work!</h2>
              <div className="text-5xl font-black text-indigo-400 mb-4 tracking-tighter">{showCelebration.count} LEADS</div>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                You&apos;ve officially hit the <span className="text-white font-bold">{showCelebration.count} lead milestone</span>. Your dedication is paying off—keep that momentum going!
              </p>
              <button
                onClick={() => setShowCelebration(null)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg cursor-pointer"
              >
                Let&apos;s Keep Going!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h3 className="text-lg font-bold text-white">Schedule Meeting</h3>
                <button onClick={() => setShowScheduleModal(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Lead</label>
                  <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium">{showScheduleModal.leadName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Meeting Type</label>
                  <Select
                    value={meetingForm.type}
                    onChange={(e) => setMeetingForm({ ...meetingForm, type: e.target.value as LeadMeetingType })}
                    className="bg-slate-950 border-slate-800"
                  >
                    <option value="Strategy Session">Strategy Session</option>
                    <option value="Follow-up">Follow-up</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                  <Input
                    required
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Time</label>
                    <Input
                      required
                      type="time"
                      value={meetingForm.time}
                      onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">AM/PM</label>
                    <Select
                      value={meetingForm.ampm}
                      onChange={(e) => setMeetingForm({ ...meetingForm, ampm: e.target.value as "AM" | "PM" })}
                      className="bg-slate-950 border-slate-800"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Timezone</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Select
                      value={meetingForm.timezone}
                      onChange={(e) => setMeetingForm({ ...meetingForm, timezone: e.target.value })}
                      className="pl-10 bg-slate-950 border-slate-800"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Phoenix">Mountain Time - AZ (no DST)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="UTC">UTC</option>
                    </Select>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowScheduleModal(null)} className="flex-1 px-4 py-2 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer">
                    Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">{editingLeadId ? "Edit Lead" : "Add New Lead"}</h3>
                  {editingLeadId && (
                    <Tooltip content="Delete Lead">
                      <button
                        type="button"
                        onClick={() => {
                          const lead = leads.find((l) => l.id === editingLeadId);
                          if (lead) {
                            setConfirmDelete({ type: "lead", id: lead.id, name: lead.name });
                            setShowAddModal(false);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingLeadId(null); }} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                    <Input
                      required
                      type="text"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      className="bg-slate-950 border-slate-800"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Source</label>
                    <Select
                      value={newLead.source}
                      onChange={(e) => setNewLead({ ...newLead, source: e.target.value as Lead["source"] })}
                      className="bg-slate-950 border-slate-800"
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Reddit">Reddit</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                </div>

                {newLead.source === "Other" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Other Source Details</label>
                    <Input
                      required
                      type="text"
                      value={customSource}
                      onChange={(e) => setCustomSource(e.target.value)}
                      className="bg-slate-950 border-slate-800"
                      placeholder="e.g. TikTok, Referral, etc."
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number (Optional)</label>
                    <Input
                      type="tel"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      className="bg-slate-950 border-slate-800"
                      placeholder="555-012-3456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email Address (Optional)</label>
                    <Input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      className="bg-slate-950 border-slate-800"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Notes (Optional)</label>
                  <Textarea
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-20 resize-none"
                    placeholder="Add any relevant details about the lead..."
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-indigo-400 mb-1">Admin Notes (Private)</label>
                    <Textarea
                      value={newLead.adminNotes}
                      onChange={(e) => setNewLead({ ...newLead, adminNotes: e.target.value })}
                      className="bg-slate-950 border-indigo-500/20 h-20 resize-none"
                      placeholder="Confidential notes visible only to admins..."
                    />
                  </div>
                )}

                {editingLeadId && (
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <ShoppingBag className="w-4 h-4" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">{isAdmin ? "Purchase Tracking (Admin Only)" : "Payment Status"}</h4>
                      </div>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setNewLead((prev) => ({ ...prev, isPaid: !prev.isPaid }))}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            newLead.isPaid ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {newLead.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {newLead.isPaid ? "Paid" : "Mark as Paid"}
                        </button>
                      ) : (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${
                          newLead.isPaid ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}>
                          {newLead.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {newLead.isPaid ? "Paid" : "Unpaid"}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Services Purchased</label>
                          <div className="grid grid-cols-2 gap-2">
                            {PURCHASE_OPTIONS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => togglePurchasedItem(option)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left cursor-pointer ${
                                  newLead.purchasedItems.includes(option)
                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Total Purchase Amount ($)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                              type="number"
                              value={newLead.purchaseTotal}
                              onChange={(e) => setNewLead({ ...newLead, purchaseTotal: parseFloat(e.target.value) || 0 })}
                              className="pl-10 bg-slate-950 border-slate-800"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setShowAddModal(false); setEditingLeadId(null); }} className="flex-1 px-4 py-2 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer">
                    {editingLeadId ? "Save Changes" : "Add Lead"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                    <p className="text-slate-400 text-sm">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete the {confirmDelete.type} <span className="text-white font-semibold">&quot;{confirmDelete.name}&quot;</span>?
                </p>

                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDelete.type === "lead") {
                        onDeleteLead?.(confirmDelete.id);
                      }
                      setConfirmDelete(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
