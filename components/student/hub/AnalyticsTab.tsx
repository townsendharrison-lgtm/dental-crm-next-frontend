"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  History, LineChart, BarChart3, Sparkles
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Student, Experience, OptimizationPlan } from '@/lib/types';
import { NATIONAL_BENCHMARKS, parseLocalDate } from './hubShared';
import { Badge } from '@/components/ui';

interface AnalyticsTabProps {
  student: Student;
  experiences: Experience[];
  optimizationPlan?: OptimizationPlan;
}

export default function AnalyticsTab({
  student,
  experiences,
  optimizationPlan,
}: AnalyticsTabProps) {
  const overallScore = optimizationPlan?.overallScore ?? optimizationPlan?.overall_score ?? 0;

  // Real cumulative hours by month (not fake score trending)
  const hoursHistory = useMemo(() => {
    const months: { date: Date; month: string; hours: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        date: d,
        month: d.toLocaleString("default", { month: "short" }),
        hours: 0,
      });
    }

    const allSessions = (experiences || []).flatMap((e) => e.sessions || []);

    return months.map((m) => {
      const monthEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0, 23, 59, 59);
      const hours = allSessions
        .filter((s) => parseLocalDate(s.date) <= monthEnd)
        .reduce((sum, s) => sum + (s.duration || 0), 0);
      return { month: m.month, hours: Math.round(hours * 10) / 10 };
    });
  }, [experiences]);

  const momentumData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        date: d,
        label: d.toLocaleString('default', { month: 'short' }),
        volunteering: 0,
        shadowing: 0
      });
    }

    const allSessions = (experiences || []).flatMap(e =>
      (e.sessions || []).map(s => ({ ...s, category: e.category }))
    );

    return months.map(m => {
      const monthEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0);
      const volHours = allSessions
        .filter(s => s.category === 'Volunteering' && parseLocalDate(s.date) <= monthEnd)
        .reduce((sum, s) => sum + s.duration, 0);
      const shadHours = allSessions
        .filter(s => s.category === 'Shadowing' && parseLocalDate(s.date) <= monthEnd)
        .reduce((sum, s) => sum + s.duration, 0);
      return {
        month: m.label,
        volunteering: volHours,
        shadowing: shadHours
      };
    });
  }, [experiences]);

  const categoryData = useMemo(() => {
    const categories = [
      { id: 'Volunteering', label: 'Volunteering' },
      { id: 'Research', label: 'Research' },
      { id: 'Shadowing', label: 'Shadowing' },
      { id: 'Dental Experience', label: 'Dental Experiences' },
      { id: 'Academic', label: 'Academic Enrichment' },
      { id: 'Employment', label: 'Employment' }
    ];
    return categories.map(cat => ({
      name: cat.label,
      hours: (experiences || []).filter(e => e.category === cat.id).reduce((sum, e) => sum + (e.sessions || []).reduce((sSum, s) => sSum + s.duration, 0), 0)
    }));
  }, [experiences]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-6 relative z-10">Overall Strength</h3>

          <div className="relative w-48 h-48 mb-4 z-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-800/50"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={552.92}
                initial={{ strokeDashoffset: 552.92 }}
                animate={{ strokeDashoffset: 552.92 - (552.92 * overallScore) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                className="text-indigo-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-semibold text-white">{overallScore}</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Index Score</span>
            </div>
          </div>

          <div className="text-center relative z-10">
            <p className="text-sm text-slate-400">Your application is currently in the</p>
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mt-1">
              {overallScore > 80 ? 'Elite Competitive' :
               overallScore > 60 ? 'Strong Competitive' :
               'Developing'} Range
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="text-indigo-400" size={20} /> Cumulative Hours
            </h3>
            <Badge variant="outline">Last 6 months</Badge>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hoursHistory}>
                <defs>
                  <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#hoursGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <LineChart className="text-indigo-400" size={20} /> Hour Growth Momentum
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Volunteering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Shadowing</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={momentumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="volunteering" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shadowing" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 blur-[100px] -ml-32 -mb-32 rounded-full" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-indigo-400 w-5 h-5" />
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Competitive Alignment Index</span>
              </div>
              <h3 className="text-lg font-semibold text-white">National Benchmark Comparison</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">Compare your current metrics against the national averages of accepted dental students to identify strategic growth opportunities.</p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col items-center">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Your Score</span>
                <span className="text-lg font-semibold text-white">{student.strengthScore || 0}</span>
              </div>
              <div className="px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col items-center">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Benchmark</span>
                <span className="text-lg font-semibold text-indigo-400">85</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {NATIONAL_BENCHMARKS.map((item, idx) => {
              let studentValue = 0;
              if (item.key === 'strengthScore') studentValue = student.strengthScore || 0;
              else if (item.key === 'avgResponseTime') studentValue = Number(student.avgResponseTime) || 0;
              else if (item.key === 'datAA') studentValue = student.datAA || 0;
              else if (item.key === 'datTS') studentValue = student.datTS || 0;
              else if (item.key === 'shadowing') studentValue = (experiences || []).filter(e => e.category === 'Shadowing').reduce((sum, e) => sum + (e.sessions || []).reduce((sSum, s) => sSum + s.duration, 0), 0);
              else if (item.key === 'dental') studentValue = (experiences || []).filter(e => e.category === 'Dental Experience').reduce((sum, e) => sum + (e.sessions || []).reduce((sSum, s) => sSum + s.duration, 0), 0);
              else if (item.key === 'volunteering') studentValue = (experiences || []).filter(e => e.category === 'Volunteering').reduce((sum, e) => sum + (e.sessions || []).reduce((sSum, s) => sSum + s.duration, 0), 0);
              else if (item.key === 'research') studentValue = (experiences || []).filter(e => e.category === 'Research').length;
              else if (item.key === 'academic') studentValue = (experiences || []).filter(e => e.category === 'Academic').length;
              else if (item.key === 'leadership') {
                studentValue = (experiences || []).filter(
                  (e) =>
                    /lead/i.test(e.title || '') ||
                    /lead/i.test(e.description || '') ||
                    e.category === 'Employment',
                ).length;
              }
              else if (item.key === 'dexterity') {
                studentValue = optimizationPlan?.manualDexterity?.status
                  ? optimizationPlan.manualDexterity.status === 'Strong'
                    ? 2
                    : 1
                  : 0;
              }

              const diff = studentValue - item.benchmark;
              const isAbove = diff >= 0;
              const isNear = !isAbove && Math.abs(diff) < (item.benchmark * 0.1);
              const insight = isAbove ? 'Above National Average' : (isNear ? 'Within Competitive Range' : 'Below Typical Accepted Range');
              const badgeVariant = isAbove ? 'success' : (isNear ? 'warning' : 'danger');

              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-indigo-500/50 transition-all cursor-help"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</span>
                      <div className={`w-2 h-2 rounded-full ${isAbove ? 'bg-emerald-500' : (isNear ? 'bg-amber-500' : 'bg-rose-500')}`} />
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-3xl font-semibold text-white">{studentValue}</span>
                      <span className="text-sm font-medium text-slate-600">{item.unit}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-medium text-slate-600 uppercase">Benchmark:</span>
                      <span className="text-xs font-semibold text-slate-400">{item.benchmark}{item.unit}</span>
                      <span className={`text-xs font-semibold ${isAbove ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isAbove ? '+' : ''}{diff.toFixed(item.key.includes('strengthScore') ? 2 : 0)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (studentValue / (item.benchmark * 1.2)) * 100)}%` }}
                          className={`h-full rounded-full ${isAbove ? 'bg-emerald-500' : (isNear ? 'bg-amber-500' : 'bg-rose-500')}`}
                        />
                      </div>
                      <Badge variant={badgeVariant} className="w-full justify-center">
                        {insight}
                      </Badge>
                    </div>
                  </div>

                  <div className="absolute bottom-full left-0 w-full mb-3 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl">
                      <p className="text-xs font-semibold text-indigo-400 uppercase mb-1">Why this matters</p>
                      <p className="text-sm text-slate-400 leading-relaxed">{item.description}. Admissions committees use this to evaluate your readiness for the rigorous dental curriculum.</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-600 italic">Benchmarks are based on aggregated data from accepted U.S. dental students and institutional reporting.</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Competitive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Borderline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Needs Focus</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={20} /> Category Distribution
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                cursor={{ fill: '#1e293b', opacity: 0.4 }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.name === 'Shadowing' ? '#fbbf24' :
                    entry.name === 'Research' ? '#818cf8' :
                    entry.name === 'Volunteering' ? '#34d399' :
                    entry.name === 'Dental Experiences' ? '#f43f5e' :
                    entry.name === 'Academic Enrichment' ? '#06b6d4' :
                    '#64748b'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="text-indigo-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Strategic Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(optimizationPlan?.roadmap?.phase1 || []).map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-slate-950/30 border border-slate-800 rounded-xl group hover:border-indigo-500/30 transition-all">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-indigo-400">{idx + 1}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Priority Action</p>
                <p className="text-sm text-slate-400 leading-relaxed">{rec}</p>
              </div>
            </div>
          ))}
          {(optimizationPlan?.roadmap?.phase2 || []).map((rec, idx) => (
            <div key={`p2-${idx}`} className="flex items-start gap-3 p-4 bg-slate-950/30 border border-slate-800 rounded-xl group hover:border-indigo-500/30 transition-all">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-emerald-400">{idx + 1}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Secondary Action</p>
                <p className="text-sm text-slate-400 leading-relaxed">{rec}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
