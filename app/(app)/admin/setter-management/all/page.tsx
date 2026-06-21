"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeads, useSetters, useDeleteSetter } from "@/lib/hooks/useLeads";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useRole } from "@/lib/hooks/useRole";
import {
  ChevronLeft,
  UserCircle2,
  Trash2,
  ArrowRight,
  Search,
  AlertCircle,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { motion, AnimatePresence } from "framer-motion";

export default function AllSettersPage() {
  const router = useRouter();
  const { role } = useRole();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: setters = [], isLoading: settersLoading } = useSetters();
  const deleteSetter = useDeleteSetter();

  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const filteredSetters = useMemo(() => {
    return setters.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [setters, searchTerm]);

  const setterMetrics = useMemo(() => {
    return setters.reduce((acc, setter) => {
      const setterLeads = leads.filter((l) => l.setterId === setter.id);
      const paidLeads = setterLeads.filter((l) => l.isPaid).length;
      const conversionRate = setterLeads.length > 0 ? (paidLeads / setterLeads.length) * 100 : 0;
      const revenue = setterLeads.reduce((sum, l) => sum + (l.purchaseTotal || 0), 0);
      acc[setter.id] = {
        totalLeads: setterLeads.length,
        paidLeads,
        conversionRate,
        revenue,
      };
      return acc;
    }, {} as Record<string, { totalLeads: number; paidLeads: number; conversionRate: number; revenue: number }>);
  }, [leads, setters]);

  if (!role) return null;
  if (leadsLoading || settersLoading) {
    return <FullPageSpinner label="Loading setters list…" />;
  }

  const handleBackClick = () => {
    router.push("/admin/setter-management");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="lg:hidden">
            <h1 className="text-2xl font-bold text-white">All Setters</h1>
            <p className="text-slate-400 text-sm">Manage and review performance of all outreach setters</p>
          </div>
        </div>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search setters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Setter Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Total Leads</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Conversion Rate</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Revenue Generated</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSetters.map((setter) => {
                const metrics = setterMetrics[setter.id] || { totalLeads: 0, paidLeads: 0, conversionRate: 0, revenue: 0 };
                return (
                  <tr key={setter.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                        <UserCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{setter.name}</div>
                        <div className="text-xs text-slate-500">{setter.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300 font-medium">{metrics.totalLeads}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-indigo-400 font-bold">{metrics.conversionRate.toFixed(1)}%</span>
                        <div className="w-24 mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${metrics.conversionRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-emerald-400 font-bold">${metrics.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/setter-management/${setter.id}`)}
                          className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-bold rounded-lg border border-indigo-600/20 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          View Leads <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <Tooltip content="Delete Setter">
                          <button
                            onClick={() => setConfirmDelete({ id: setter.id, name: setter.name })}
                            className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSetters.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No setters found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  Are you sure you want to delete the setter <span className="text-white font-semibold">&quot;{confirmDelete.name}&quot;</span>? This will also remove all leads associated with this setter.
                </p>

                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      deleteSetter.mutate(confirmDelete.id);
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
}
