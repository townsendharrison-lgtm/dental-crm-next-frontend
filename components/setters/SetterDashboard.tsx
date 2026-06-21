"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users,
  BarChart3,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Award,
  TrendingUp,
  UserCircle2,
} from "lucide-react";
import type {
  Lead,
  UserRole,
  SetterUser,
} from "@/lib/types";

interface SetterDashboardProps {
  leads: Lead[];
  setters: SetterUser[];
  onUpdateLeadStatus?: (leadId: string, updates: Partial<Lead>) => void;
  userRole: UserRole;
}

export const SetterDashboard: React.FC<SetterDashboardProps> = (props) => {
  return <SetterDashboardInner {...props} />;
};

const SetterDashboardInner: React.FC<SetterDashboardProps> = ({
  leads,
  setters,
  onUpdateLeadStatus,
  userRole,
}) => {
  const router = useRouter();
  const isAdmin = userRole === "ADMIN";

  // Filter leads to valid setters
  const baseLeads = useMemo(() => {
    const setterIds = setters.map((s) => s.id);
    return leads.filter((l) => setterIds.includes(l.setterId));
  }, [leads, setters]);

  const pendingLeads = useMemo(() => leads.filter((l) => l.showedUp && !l.isPaid), [leads]);

  const pendingBySetter = useMemo(() => {
    const map: Record<string, { setter: SetterUser; leads: Lead[] }> = {};
    pendingLeads.forEach((lead) => {
      if (!map[lead.setterId]) {
        const setter = setters.find((s) => s.id === lead.setterId);
        if (setter) map[lead.setterId] = { setter, leads: [] };
      }
      if (map[lead.setterId]) map[lead.setterId].leads.push(lead);
    });
    return Object.values(map).sort((a, b) => b.leads.length - a.leads.length);
  }, [pendingLeads, setters]);

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
    const setterPerformance: Record<string, { id: string; name: string; leads: number; sales: number }> = {};

    baseLeads.forEach((lead) => {
      const setter = setters.find((s) => s.id === lead.setterId);
      const setterName = setter ? setter.name : "Unknown";
      if (!setterPerformance[lead.setterId]) {
        setterPerformance[lead.setterId] = { id: lead.setterId, name: setterName, leads: 0, sales: 0 };
      }
      setterPerformance[lead.setterId].leads++;
      setterPerformance[lead.setterId].sales += lead.purchaseTotal || 0;
    });

    const setterChart = Object.values(setterPerformance).sort((a, b) => b.leads - a.leads);

    return { setterChart };
  }, [baseLeads, setters]);

  const findSetter = (id: string | null | undefined) => setters.find((s) => s.id === id);

  const routePrefix = isAdmin ? "admin" : "setter";

  return (
    <div className="space-y-6">
      {/* Overview/Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white">Overall Performance</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Total Leads (All Setters)</div>
                <div className="text-3xl font-bold text-white">{baseLeads.length}</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Total Revenue</div>
                <div className="text-3xl font-bold text-emerald-400">${performanceMetrics.totalRevenue.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Showed Up/Qualified Close Ratio</div>
                <div className="text-3xl font-bold text-indigo-400">{performanceMetrics.closeRatio.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{performanceMetrics.purchaseCount} / {performanceMetrics.showUpCount} Showed Up/Qualified</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Avg Rev per Showed Up/Qualified</div>
                <div className="text-3xl font-bold text-emerald-400">${Math.round(performanceMetrics.avgRevenuePerShowUp).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-white">Top Performing Setters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {analyticsData.setterChart.slice(0, 3).map((setter, index) => (
                <div key={index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2">
                    <span className={`text-2xl font-black opacity-10 ${index === 0 ? "text-amber-400" : index === 1 ? "text-slate-400" : "text-orange-400"}`}>
                      #{index + 1}
                    </span>
                  </div>
                  <div className="relative z-10">
                    <div className="text-sm font-bold text-white mb-1 truncate">{setter.name}</div>
                    <div className="flex items-end gap-2">
                      <div className="text-2xl font-bold text-indigo-400">{setter.leads}</div>
                      <div className="text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Leads</div>
                    </div>
                    <div className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      ${setter.sales.toLocaleString()} Revenue
                    </div>
                  </div>
                </div>
              ))}
              {analyticsData.setterChart.length === 0 && (
                <div className="col-span-3 text-center py-8 text-slate-500 italic">No performance data available yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Pending Collections
          </h2>
          <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20 uppercase tracking-wider">
            {pendingLeads.length} Action Required
          </span>
        </div>

        {pendingLeads.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingBySetter.map(({ setter, leads: setterPendingLeads }) => (
                <motion.div
                  key={setter.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)] group-hover:border-indigo-500/30 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all">
                      <UserCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{setter.name}</h4>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                        {setterPendingLeads.length} Leads Pending
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setterPendingLeads.forEach((l) => onUpdateLeadStatus?.(l.id, { isPaid: true }));
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Paid
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingLeads.map((lead) => {
                const setter = findSetter(lead.setterId);
                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-amber-500/30 transition-all shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-slate-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{lead.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            Setter: <span className="text-indigo-400">{setter?.name || "Unknown"}</span>
                          </p>
                          {(lead.purchaseTotal || 0) > 0 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                              ${lead.purchaseTotal?.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onUpdateLeadStatus?.(lead.id, { isPaid: true })}
                      className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg border border-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Mark Paid
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-xl text-center">
            <p className="text-sm text-slate-500">No leads currently awaiting payment.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">All Setters</h2>
          <button
            onClick={() => router.push(`/${routePrefix}/setter-management/all`)}
            className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-bold rounded-lg border border-indigo-600/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {setters.slice(0, 6).map((setter) => {
            const setterLeads = baseLeads.filter((l) => l.setterId === setter.id);
            const paidLeads = setterLeads.filter((l) => l.isPaid).length;
            const conversionRate = setterLeads.length > 0 ? ((paidLeads / setterLeads.length) * 100).toFixed(1) : 0;

            return (
              <motion.button
                key={setter.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/${routePrefix}/setter-management/${setter.id}`)}
                className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-left hover:border-indigo-500/50 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/50 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <UserCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{setter.name}</h3>
                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{setter.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Total Leads</div>
                    <div className="text-lg font-bold text-white">{setterLeads.length}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Conversion</div>
                    <div className="text-lg font-bold text-indigo-400">{conversionRate}%</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end text-xs font-medium text-indigo-400 group-hover:translate-x-1 transition-transform">
                  View Leads <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
