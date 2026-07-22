import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OptimizationPlan, Experience } from '@/lib/types';
import {
  Edit3,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  Target,
  AlertCircle,
  Heart,
  Stethoscope,
  FlaskConical,
  Briefcase,
  School as SchoolIcon,
  Activity
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  SelectMenu,
  Textarea,
  Tooltip,
} from '@/components/ui';

interface ApplicationOptimizationPlanProps {
  studentName: string;
  studentCreatedAt?: string;
  plan?: OptimizationPlan;
  experiences: Experience[];
  isEditable?: boolean;
  onUpdatePlan?: (plan: OptimizationPlan) => void;
  onDeletePlan?: () => void;
}

const KPI_STATUS_OPTIONS = [
  { value: 'Strong', label: 'Strong' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Developing', label: 'Developing' },
  { value: 'Weak', label: 'Weak' },
];

const DEXTERITY_STATUS_OPTIONS = [
  { value: 'Strong', label: 'Strong' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Developing', label: 'Developing' },
  { value: 'Needs Improvement', label: 'Needs Improvement' },
];

const statusToBadgeVariant = (status: string): 'success' | 'primary' | 'warning' | 'danger' | 'default' => {
  switch (status) {
    case 'Strong':
    case 'High':
      return 'success';
    case 'Moderate':
    case 'Medium':
      return 'primary';
    case 'Developing':
      return 'warning';
    case 'Needs Improvement':
    case 'Weak':
      return 'danger';
    default:
      return 'default';
  }
};

const ApplicationOptimizationPlan: React.FC<ApplicationOptimizationPlanProps> = ({
  studentName,
  studentCreatedAt,
  plan,
  experiences,
  isEditable = false,
  onUpdatePlan,
  onDeletePlan,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlan, setEditPlan] = useState<OptimizationPlan | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedRiskTips, setExpandedRiskTips] = useState<Record<number, boolean>>({});

  const getPhaseLabel = (phaseNum: number) => {
    const ranges = [
      { start: 0, end: 3 },
      { start: 4, end: 6 },
      { start: 7, end: 9 },
      { start: 10, end: 12 }
    ];
    const { start: startMonth, end: endMonth } = ranges[phaseNum - 1];

    if (!studentCreatedAt) {
      return `Phase ${phaseNum} (${startMonth}-${endMonth} months)`;
    }

    const createdDate = new Date(studentCreatedAt);

    const startDate = new Date(createdDate);
    startDate.setMonth(createdDate.getMonth() + startMonth);

    const endDate = new Date(createdDate);
    endDate.setMonth(createdDate.getMonth() + endMonth);

    const format = (date: Date) => date.toLocaleString('default', { month: 'short', year: 'numeric' });

    return `Phase ${phaseNum} (${format(startDate)} - ${format(endDate)})`;
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (plan) {
      setEditPlan(JSON.parse(JSON.stringify({
        ...plan,
        overallScore: plan.overallScore ?? plan.overall_score ?? 0,
        improvementLeverageScore: plan.improvementLeverageScore ?? plan.improvement_leverage_score ?? 0,
        riskFactors: plan.riskFactors ?? plan.risk_factors ?? [],
        leverageActions: plan.leverageActions ?? plan.leverage_actions ?? [],
        roadmap: {
          phase1: plan.roadmap?.phase1 || [],
          phase2: plan.roadmap?.phase2 || [],
          phase3: plan.roadmap?.phase3 || [],
          phase4: plan.roadmap?.phase4 || [],
        },
        lastUpdated: plan.lastUpdated ?? plan.updated_at ?? plan.created_at,
      })));
    } else {
      setEditPlan(null);
    }
  }, [plan]);

  if (!plan || !editPlan) return null;

  // Defensive: ensure roadmap phases are always arrays
  const roadmap = {
    phase1: editPlan.roadmap?.phase1 || [],
    phase2: editPlan.roadmap?.phase2 || [],
    phase3: editPlan.roadmap?.phase3 || [],
    phase4: editPlan.roadmap?.phase4 || [],
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    if (onUpdatePlan && editPlan) {
      onUpdatePlan({
        ...editPlan,
        lastUpdated: new Date().toISOString()
      });
      setIsEditing(false);
    }
  };

  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'volunteering': return Heart;
      case 'shadowing': return Stethoscope;
      case 'research': return FlaskConical;
      case 'dental': return Activity;
      case 'academic': return SchoolIcon;
      case 'employment': return Briefcase;
      default: return Target;
    }
  };

  const calculateCurrentMetrics = (catKey: string) => {
    const categoryMap: Record<string, string> = {
      volunteering: 'Volunteering',
      shadowing: 'Shadowing',
      research: 'Research',
      dental: 'Dental Experience',
      employment: 'Employment',
      academic: 'Academic'
    };

    const cat = categoryMap[catKey];
    if (!cat) return '0 Units';

    const filtered = experiences.filter(e => e.category === cat);
    const hours = filtered.reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
    const count = filtered.length;

    if (cat === 'Volunteering') return `${hours} Hours • ${count} Organizations`;
    if (cat === 'Shadowing') {
      const generalCount = filtered.filter(e => e.dentistType === 'General').length;
      const specialtyCount = filtered.filter(e => e.dentistType === 'Specialty').length;
      return `${hours} Hours • ${generalCount} Gen • ${specialtyCount} Spec`;
    }
    if (cat === 'Research') return `${hours} Hours • ${count} Projects`;
    if (cat === 'Dental Experience') return `${hours} Hours • ${count} Clinical Roles`;
    if (cat === 'Employment') return `${count} Consistent Work History`;
    if (cat === 'Academic') return `${hours} Hours • ${count} Enrichment Programs`;

    return '0 Units';
  };

  const calculateSubGoalStatus = (catKey: string, subGoalId: string) => {
    if (catKey === 'shadowing') {
      const filtered = experiences.filter(e => e.category === 'Shadowing');
      switch (subGoalId) {
        case 'sg1': return filtered.reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
        case 'sg2': return filtered.filter(e => e.dentistType === 'General').length;
        case 'sg3': return filtered.filter(e => e.dentistType === 'Specialty').length;
        case 'sg4': return filtered.length;
        default: return 0;
      }
    }

    if (catKey === 'volunteering') {
      const filtered = experiences.filter(e => e.category === 'Volunteering');
      switch (subGoalId) {
        case 'vg1': return filtered.reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
        case 'vg2': return filtered.length;
        default: return 0;
      }
    }

    if (catKey === 'research') {
      const filtered = experiences.filter(e => e.category === 'Research');
      switch (subGoalId) {
        case 'rg1': return filtered.reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
        default: return 0;
      }
    }

    if (catKey === 'dental') {
      const filtered = experiences.filter(e => e.category === 'Dental Experience');
      switch (subGoalId) {
        case 'dg1': return filtered.reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
        case 'dg2': return filtered.length;
        default: return 0;
      }
    }

    if (catKey === 'academic') {
      const filtered = experiences.filter(e => e.category === 'Academic');
      switch (subGoalId) {
        case 'ag1': return filtered.reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
        case 'ag2': return filtered.length;
        default: return 0;
      }
    }

    return 0;
  };

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-900 text-slate-300 overflow-hidden">
      <div className="relative z-10 p-5 md:p-6 space-y-4">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-semibold text-white">Application Optimization Plan</h1>
            </div>
            <p className="text-sm text-slate-500">Mentor-authored strategy • positioning scores • clear next steps</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">Student: {studentName}</Badge>
            {isEditable && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (plan) {
                          setEditPlan(JSON.parse(JSON.stringify({
                            ...plan,
                            overallScore: plan.overallScore ?? plan.overall_score ?? 0,
                            improvementLeverageScore: plan.improvementLeverageScore ?? plan.improvement_leverage_score ?? 0,
                            riskFactors: plan.riskFactors ?? plan.risk_factors ?? [],
                            leverageActions: plan.leverageActions ?? plan.leverage_actions ?? [],
                            roadmap: {
                              phase1: plan.roadmap?.phase1 || [],
                              phase2: plan.roadmap?.phase2 || [],
                              phase3: plan.roadmap?.phase3 || [],
                              phase4: plan.roadmap?.phase4 || [],
                            },
                            lastUpdated: plan.lastUpdated ?? plan.updated_at ?? plan.created_at,
                          })));
                        }
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={<Save size={14} />}
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={<Edit3 size={14} />}
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                    {onDeletePlan && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        leftIcon={<Trash2 size={14} />}
                        onClick={onDeletePlan}
                      >
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </motion.header>

        {/* Top Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overall Strength Module */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
          >
            <Card className="border-slate-800 bg-slate-900/60 shadow-none h-full overflow-hidden">
              <CardContent className="p-5 space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative w-64 h-64 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 192 192"
                      className="w-full h-full transform -rotate-90"
                    >
                      <circle
                        cx="96"
                        cy="96"
                        r="82"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-800"
                      />
                      <motion.circle
                        cx="96"
                        cy="96"
                        r="82"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="515"
                        initial={{ strokeDashoffset: 515 }}
                        animate={isLoaded ? { strokeDashoffset: 515 - (515 * (editPlan.overallScore || 0)) / 100 } : {}}
                        transition={{ duration: 2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="text-indigo-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {isEditing ? (
                        <FormField label="Overall score" className="items-center text-center">
                          <div className="flex items-baseline gap-1 justify-center">
                            <Input
                              type="number"
                              value={(editPlan.overallScore || 0)}
                              onChange={(e) => setEditPlan({ ...editPlan, overallScore: Number(e.target.value) })}
                              className="w-28 h-auto text-center text-6xl font-semibold text-white bg-transparent border-0 border-b-2 border-indigo-500 rounded-none px-0 focus-visible:ring-0 shadow-none"
                            />
                            <span className="text-lg font-medium text-slate-500">/ 100</span>
                          </div>
                        </FormField>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-7xl font-semibold text-white">{(editPlan.overallScore || 0)}</span>
                          <span className="text-sm font-medium text-slate-500 mt-1">/ 100</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full border-t border-slate-800" />

                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Strength</h3>
                      {isEditing ? (
                        <FormField label="Leverage %" className="mb-0">
                          <Input
                            type="number"
                            value={editPlan.improvementLeverageScore || 0}
                            onChange={(e) =>
                              setEditPlan({
                                ...editPlan,
                                improvementLeverageScore: Number(e.target.value),
                              })
                            }
                            className="h-8 w-24 text-xs"
                          />
                        </FormField>
                      ) : (
                        <Tooltip content="Improvement Leverage Score: prioritize actions by their impact on admission probability.">
                          <Badge variant="primary" className="gap-1.5 cursor-help">
                            <Sparkles size={12} />
                            Leverage: {(editPlan.improvementLeverageScore || 0)}%
                          </Badge>
                        </Tooltip>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries((editPlan.kpis || {}) as Record<string, string>).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-950/30 hover:border-slate-700 transition-all">
                          <span className="text-sm font-medium text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          {isEditing ? (
                            <FormField label={key} className="mb-0 sr-only-label [&_label]:sr-only">
                              <SelectMenu
                                value={value}
                                onChange={(next) =>
                                  setEditPlan({
                                    ...editPlan,
                                    kpis: { ...(editPlan.kpis || {}), [key]: next as any },
                                  })
                                }
                                options={KPI_STATUS_OPTIONS}
                                className="min-w-[8rem] text-xs"
                              />
                            </FormField>
                          ) : (
                            <Badge variant={statusToBadgeVariant(value)}>{value}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <p className="text-xs text-slate-500 italic max-w-sm leading-relaxed">
                    * Mentor positioning assessment; does not guarantee admission.
                  </p>
                  <span className="text-sm text-slate-500">
                    Last updated: {new Date(editPlan.lastUpdated || '').toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Priority Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
          >
            <Card className="border-slate-800 bg-slate-900/60 shadow-none h-full overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-lg text-white">Strategic Flow Roadmap</CardTitle>
                <Badge variant="primary" className="gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Active Path
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(['phase1', 'phase2', 'phase3', 'phase4'] as const).map((phase, idx, phases) => {
                    const items = roadmap[phase] || [];
                    const isLast = idx === phases.length - 1;
                    return (
                      <div key={phase} className="relative flex gap-4 group/node">
                        {/* Step rail: marker + connector centered on the icon */}
                        <div className="relative flex w-8 shrink-0 flex-col items-center">
                          <div
                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all duration-500 ${
                              idx === 0
                                ? 'bg-indigo-500 border-indigo-400'
                                : 'bg-slate-950 border-slate-800 group-hover/node:border-indigo-500/50'
                            }`}
                          >
                            <span
                              className={`text-sm font-semibold ${
                                idx === 0
                                  ? 'text-white'
                                  : 'text-slate-500 group-hover/node:text-indigo-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </div>
                          {!isLast && (
                            <div
                              aria-hidden
                              className="absolute left-1/2 top-8 w-px -translate-x-1/2 bg-gradient-to-b from-indigo-500/60 via-slate-700 to-slate-800"
                              style={{ height: 'calc(100% + 1rem)' }}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-3">
                          <Badge variant="outline" className="rounded-md">
                            {getPhaseLabel(idx + 1)}
                          </Badge>

                          {!isEditing && items.length === 0 ? (
                            <EmptyState
                              title="No items in this phase"
                              description="Add roadmap tasks when editing the plan."
                              className="py-4 px-3 bg-slate-950/40 border-slate-800"
                            />
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {items.map((item: string, i: number) => (
                                <motion.div
                                  key={i}
                                  whileHover={{ x: 2 }}
                                  className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:border-indigo-500/30 transition-all"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 shrink-0" />
                                  {isEditing ? (
                                    <FormField label={`Phase ${idx + 1} item ${i + 1}`} className="mb-0 w-full [&_label]:sr-only">
                                      <div className="flex items-center gap-2 w-full">
                                        <Input
                                          value={item}
                                          onChange={(e) => {
                                            const newRoadmap = { ...editPlan.roadmap };
                                            (newRoadmap as any)[phase][i] = e.target.value;
                                            setEditPlan({ ...editPlan, roadmap: newRoadmap });
                                          }}
                                          className="h-8 bg-transparent border-0 border-b border-slate-800 rounded-none px-0 focus-visible:ring-0 shadow-none"
                                        />
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-rose-500 hover:text-rose-400 shrink-0"
                                          onClick={() => {
                                            const newRoadmap = { ...editPlan.roadmap };
                                            (newRoadmap as any)[phase].splice(i, 1);
                                            setEditPlan({ ...editPlan, roadmap: newRoadmap });
                                          }}
                                          aria-label="Remove roadmap item"
                                        >
                                          <Trash2 size={12} />
                                        </Button>
                                      </div>
                                    </FormField>
                                  ) : (
                                    item
                                  )}
                                </motion.div>
                              ))}
                              {isEditing && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-dashed"
                                  leftIcon={<Plus size={12} />}
                                  onClick={() => {
                                    const newRoadmap = { ...editPlan.roadmap };
                                    (newRoadmap as any)[phase].push('New task...');
                                    setEditPlan({ ...editPlan, roadmap: newRoadmap });
                                  }}
                                >
                                  Add
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Improvement Leverage Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
        >
          <Card className="border-slate-800 bg-slate-900/60 shadow-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Improvement Leverage Actions</CardTitle>
                  <CardDescription className="text-slate-500">
                    Prioritize actions by their impact on admission probability.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!editPlan.leverageActions?.length ? (
                <EmptyState
                  icon={<Sparkles size={20} />}
                  title="No leverage actions yet"
                  description="Add high-impact actions when editing this plan."
                  className="py-8 bg-slate-950/40 border-slate-800"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {editPlan.leverageActions.map((action, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -2 }}
                      className="relative group"
                    >
                      <div className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3 hover:border-indigo-500/30 transition-all h-full flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-semibold text-slate-800/60 group-hover:text-indigo-500/20 transition-colors">{idx + 1}</span>
                          <Badge variant={statusToBadgeVariant(action.impact)}>
                            {action.impact} Impact
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1.5 group-hover:text-indigo-400 transition-colors">{action.title}</h4>
                          <p className="text-sm text-slate-400 leading-relaxed">{action.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Factors */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
        >
          <Card className="border-rose-500/20 bg-rose-500/5 shadow-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="text-rose-500" size={18} />
                <div>
                  <CardTitle className="text-lg text-white">Risk Factors</CardTitle>
                  <CardDescription className="text-slate-500">Mentor-identified risks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!editPlan.riskFactors?.length ? (
                <EmptyState
                  icon={<AlertCircle size={20} />}
                  title="No risk factors yet"
                  description="Document application risks and mitigations when editing."
                  className="py-8 bg-slate-950/40 border-slate-800"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editPlan.riskFactors.map((risk, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-white">{risk.factor}</h4>
                        <Badge variant={statusToBadgeVariant(risk.severity)}>
                          {risk.severity} Risk
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{risk.description}</p>

                      <div className="pt-3 border-t border-slate-800">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-0 text-emerald-400 hover:text-emerald-300 hover:bg-transparent"
                          leftIcon={<Target size={14} />}
                          rightIcon={
                            <motion.span animate={{ rotate: expandedRiskTips[idx] ? 180 : 0 }} className="inline-flex">
                              <ChevronDown size={12} />
                            </motion.span>
                          }
                          onClick={() => setExpandedRiskTips(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        >
                          Recommended Expert Tip
                        </Button>

                        <AnimatePresence>
                          {expandedRiskTips[idx] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="text-sm text-emerald-400/80 font-medium italic mt-3 pl-4 border-l border-emerald-500/20">
                                Mitigation: {risk.mitigation}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Sections */}
        <div className="space-y-4">
          {(Object.entries((editPlan.categories || {})) as [string, any][]).map(([key, cat]) => {
            const isExpanded = expandedCategories[key];
            const currentHours = experiences.filter(e => e.category === (key === 'dental' ? 'Dental Experience' : key.charAt(0).toUpperCase() + key.slice(1)))
              .reduce((acc, e) => acc + (e.sessions || []).reduce((sAcc, s) => sAcc + s.duration, 0), 0);
            const progress = cat.targetGoal ? Math.min(100, (currentHours / cat.targetGoal.value) * 100) : 0;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={isLoaded ? { opacity: 1, y: 0 } : {}}
              >
                <Card
                  className={`bg-slate-900/60 shadow-none transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'border-indigo-500/40' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggleCategory(key)}
                  className="w-full h-auto p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group rounded-none hover:bg-transparent"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}>
                      {React.createElement(getCategoryIcon(key), { size: 18 })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-base font-semibold text-white capitalize">
                          {key === 'dental' ? 'Dental Experiences' : key === 'academic' ? 'Academic Enrichment' : key}
                        </h4>
                        <Badge variant={statusToBadgeVariant(cat.status)}>{cat.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">{calculateCurrentMetrics(key)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {!isExpanded && cat.targetGoal && (
                      <div className="hidden sm:block w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    <div className={`p-1.5 rounded-lg border transition-all ${
                      isExpanded ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-600 group-hover:text-slate-400'
                    }`}>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                        <ChevronDown size={16} />
                      </motion.div>
                    </div>
                  </div>
                </Button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-4 border-t border-slate-800 pt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            {(key === 'shadowing' || key === 'volunteering' || key === 'research' || key === 'dental' || key === 'academic') && cat.subGoals ? (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Detailed Progress Tracking</p>
                                <div className="space-y-3">
                                  {cat.subGoals.map((subGoal: any, sgIdx: number) => {
                                    const current = calculateSubGoalStatus(key, subGoal.id);
                                    const subProgress = Math.min(100, (current / subGoal.target) * 100);

                                    return (
                                      <div key={subGoal.id} className="space-y-1.5">
                                        <div className="flex justify-between items-center gap-2">
                                          <span className="text-sm font-medium text-slate-400">{subGoal.label}</span>
                                          <div className="flex items-center gap-1.5">
                                            {isEditing ? (
                                              <FormField label={`${subGoal.label} target`} className="mb-0 [&_label]:sr-only">
                                                <div className="flex items-center gap-1.5">
                                                  <Input
                                                    type="number"
                                                    value={subGoal.target}
                                                    onChange={(e) => {
                                                      const newCats = { ...(editPlan.categories || {}) };
                                                      if (newCats[key].subGoals) {
                                                        newCats[key].subGoals![sgIdx].target = Number(e.target.value);
                                                        setEditPlan({ ...editPlan, categories: newCats });
                                                      }
                                                    }}
                                                    className="w-14 h-7 text-xs text-center px-1"
                                                  />
                                                  <span className="text-xs text-slate-500">{subGoal.unit}</span>
                                                </div>
                                              </FormField>
                                            ) : (
                                              <span className="text-xs font-semibold text-white">{current} / {subGoal.target} {subGoal.unit}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${subProgress}%` }}
                                            className={`h-full ${subProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex justify-between items-end gap-2">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Goal Achievement</p>
                                  {cat.targetGoal && (
                                    <p className="text-sm text-slate-500">Target: {cat.targetGoal.value} {cat.targetGoal.unit}</p>
                                  )}
                                </div>
                                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                                  <p className="text-lg font-semibold text-white mb-2">{calculateCurrentMetrics(key)}</p>
                                  {cat.targetGoal && (
                                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-indigo-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <Sparkles size={12} className="text-indigo-400" />
                                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Strategic Action Plan</p>
                              </div>
                              {isEditing ? (
                                <FormField label="Strategic action plan">
                                  <Textarea
                                    value={cat.actionPlan}
                                    onChange={(e) => setEditPlan({
                                      ...editPlan,
                                      categories: {
                                        ...(editPlan.categories || {}),
                                        [key]: { ...cat, actionPlan: e.target.value }
                                      }
                                    })}
                                    className="min-h-[80px] text-sm"
                                  />
                                </FormField>
                              ) : (
                                <p className="text-sm text-slate-300 leading-relaxed">{cat.actionPlan}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expert Recommendations</p>
                                {isEditing && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      const newCats = { ...(editPlan.categories || {}) };
                                      if (newCats[key]) {
                                        const recommended = newCats[key].recommended || [];
                                        newCats[key] = { ...newCats[key], recommended: [...recommended, 'New recommendation...'] };
                                        setEditPlan({ ...editPlan, categories: newCats });
                                      }
                                    }}
                                    aria-label="Add recommendation"
                                  >
                                    <Plus size={12} />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {cat.recommended.map((rec: string, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 group/rec hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                      {isEditing ? (
                                        <Input
                                          value={rec}
                                          onChange={(e) => {
                                            const newCats = { ...(editPlan.categories || {}) };
                                            if (newCats[key] && newCats[key].recommended) {
                                              const recommended = [...newCats[key].recommended];
                                              recommended[idx] = e.target.value;
                                              newCats[key] = { ...newCats[key], recommended };
                                              setEditPlan({ ...editPlan, categories: newCats });
                                            }
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      ) : (
                                        <p className="text-sm font-medium text-slate-300">{rec}</p>
                                      )}
                                    </div>
                                    {!isEditing && (
                                      <Button type="button" size="sm" className="shrink-0 h-7 text-xs">
                                        {cat.cta}
                                      </Button>
                                    )}
                                    {isEditing && (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-rose-500 hover:text-rose-400 shrink-0"
                                        onClick={() => {
                                          const newCats = { ...(editPlan.categories || {}) };
                                          if (newCats[key] && newCats[key].recommended) {
                                            const recommended = [...newCats[key].recommended];
                                            recommended.splice(idx, 1);
                                            newCats[key] = { ...newCats[key], recommended };
                                            setEditPlan({ ...editPlan, categories: newCats });
                                          }
                                        }}
                                        aria-label="Remove recommendation"
                                      >
                                        <Trash2 size={12} />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/30">
                              <div className="flex items-center gap-2 mb-2">
                                <Edit3 size={12} className="text-slate-500" />
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mentor Insights</p>
                              </div>
                              {isEditing ? (
                                <FormField label="Mentor insights">
                                  <Textarea
                                    value={cat.mentorNotes}
                                    onChange={(e) => setEditPlan({
                                      ...editPlan,
                                      categories: {
                                        ...(editPlan.categories || {}),
                                        [key]: { ...cat, mentorNotes: e.target.value }
                                      }
                                    })}
                                    className="min-h-[60px] text-sm italic"
                                  />
                                </FormField>
                              ) : (
                                <p className="text-sm text-slate-400 italic leading-relaxed">
                                  &quot;{cat.mentorNotes}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Manual Dexterity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
        >
          <Card className="border-slate-800 bg-slate-900/60 shadow-none overflow-hidden">
            <CardHeader className="flex-row items-center gap-3 flex-wrap space-y-0">
              <CardTitle className="text-lg text-white">Manual Dexterity</CardTitle>
              {isEditing ? (
                <FormField label="Status" className="mb-0 [&_label]:sr-only">
                  <SelectMenu
                    value={editPlan.manualDexterity?.status || 'Developing'}
                    onChange={(status) =>
                      setEditPlan({
                        ...editPlan,
                        manualDexterity: { ...editPlan.manualDexterity, status },
                      })
                    }
                    options={DEXTERITY_STATUS_OPTIONS}
                    className="min-w-[10rem] text-xs"
                  />
                </FormField>
              ) : (
                <Badge variant={statusToBadgeVariant(editPlan.manualDexterity?.status || 'Developing')}>
                  {(editPlan.manualDexterity?.status || 'Developing')}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {isEditing ? (
                  <FormField label="Description">
                    <Textarea
                      value={(editPlan.manualDexterity?.description || '')}
                      onChange={(e) => setEditPlan({
                        ...editPlan,
                        manualDexterity: { ...editPlan.manualDexterity, description: e.target.value }
                      })}
                      className="min-h-[60px] text-sm max-w-3xl"
                    />
                  </FormField>
                ) : (
                  <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
                    {(editPlan.manualDexterity?.description || '')}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Strategic Recommendations</p>
                  {isEditing && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-indigo-400"
                      onClick={() => {
                        const newMD = { ...(editPlan.manualDexterity || {}) };
                        const recommendations = [...(newMD.recommendations || [])];
                        recommendations.push('New recommendation...');
                        newMD.recommendations = recommendations;
                        setEditPlan({ ...editPlan, manualDexterity: newMD as any });
                      }}
                      aria-label="Add dexterity recommendation"
                    >
                      <Plus size={14} />
                    </Button>
                  )}
                </div>
                {!(editPlan.manualDexterity?.recommendations || []).length && !isEditing ? (
                  <EmptyState
                    title="No recommendations"
                    description="Add dexterity recommendations when editing."
                    className="py-6 bg-transparent border-slate-800"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(editPlan.manualDexterity?.recommendations || []).map((rec, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800 group/mdrec">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <Sparkles size={12} className="text-indigo-500 shrink-0" />
                          {isEditing ? (
                            <FormField label={`Recommendation ${idx + 1}`} className="mb-0 w-full [&_label]:sr-only">
                              <Input
                                value={rec}
                                onChange={(e) => {
                                  const newMD = { ...(editPlan.manualDexterity || {}) };
                                  if (newMD.recommendations) {
                                    const recommendations = [...newMD.recommendations];
                                    recommendations[idx] = e.target.value;
                                    newMD.recommendations = recommendations;
                                    setEditPlan({ ...editPlan, manualDexterity: newMD as any });
                                  }
                                }}
                                className="h-8 text-sm"
                              />
                            </FormField>
                          ) : (
                            <p className="text-sm text-slate-200 font-medium">{rec}</p>
                          )}
                        </div>
                        {isEditing && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-500 hover:text-rose-400 opacity-0 group-hover/mdrec:opacity-100 transition-opacity shrink-0"
                            onClick={() => {
                              const newMD = { ...(editPlan.manualDexterity || {}) };
                              if (newMD.recommendations) {
                                const recommendations = [...newMD.recommendations];
                                recommendations.splice(idx, 1);
                                newMD.recommendations = recommendations;
                                setEditPlan({ ...editPlan, manualDexterity: newMD as any });
                              }
                            }}
                            aria-label="Remove dexterity recommendation"
                          >
                            <Trash2 size={12} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ApplicationOptimizationPlan;
