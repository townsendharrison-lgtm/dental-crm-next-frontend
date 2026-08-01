"use client";

import React from 'react';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Heart,
  Sparkles,
  Activity,
  Briefcase,
  FlaskConical,
  Stethoscope,
  Users,
  School as SchoolIcon,
  Star,
  Shield,
  Zap,
  Award,
  BookOpen,
  GraduationCap,
  MapPin,
  Flag,
  Gem,
  Trash2,
  Plus,
  X,
  GripVertical,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Student,
  Experience,
  School,
  ApplicationStatus,
  Milestone,
  SchoolCategory,
  OptimizationPlan,
  Application,
  PlatformConfig,
  ImprovementGoal,
} from '@/lib/types';
import { Badge, Button, Textarea, FormField } from '@/components/ui';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { cn } from '@/lib/utils/cn';

export const ICON_MAP: Record<string, React.ReactNode> = {
  'Target': <Target size={18} />,
  'CheckCircle2': <CheckCircle2 size={18} />,
  'TrendingUp': <TrendingUp size={18} />,
  'Heart': <Heart size={18} />,
  'Sparkles': <Sparkles size={18} />,
  'Activity': <Activity size={18} />,
  'Briefcase': <Briefcase size={18} />,
  'FlaskConical': <FlaskConical size={18} />,
  'Stethoscope': <Stethoscope size={18} />,
  'Users': <Users size={18} />,
  'SchoolIcon': <SchoolIcon size={18} />,
  'Star': <Star size={18} />,
  'Shield': <Shield size={18} />,
  'Zap': <Zap size={18} />,
  'Award': <Award size={18} />,
  'BookOpen': <BookOpen size={18} />,
  'GraduationCap': <GraduationCap size={18} />,
  'MapPin': <MapPin size={18} />,
  'Flag': <Flag size={18} />,
  'Gem': <Gem size={18} />
};

/** Left → right: Strong Fit, Target, Reach */
export const DEFAULT_CATEGORIES: SchoolCategory[] = [
  { id: 'Strong Fit', name: 'Strong Fit', color: '#10b981', icon: 'TrendingUp' },
  { id: 'Target', name: 'Target', color: '#6366f1', icon: 'CheckCircle2' },
  { id: 'Reach', name: 'Reach', color: '#f43f5e', icon: 'Target' },
];

export const DEFAULT_CATEGORY_ORDER = DEFAULT_CATEGORIES.map((c) => c.id);

/** Keep default buckets in Strong Fit → Target → Reach; custom categories follow. */
export function orderSchoolCategories(categories: SchoolCategory[]): SchoolCategory[] {
  if (!categories.length) return [...DEFAULT_CATEGORIES];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered: SchoolCategory[] = [];
  for (const id of DEFAULT_CATEGORY_ORDER) {
    const cat = byId.get(id);
    if (cat) {
      ordered.push(cat);
      byId.delete(id);
    }
  }
  for (const cat of categories) {
    if (byId.has(cat.id)) {
      ordered.push(cat);
      byId.delete(cat.id);
    }
  }
  return ordered;
}

export const AVAILABLE_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#94a3b8'
];

export const AVAILABLE_ICONS = [
  'Target', 'CheckCircle2', 'TrendingUp', 'Heart', 'Sparkles', 'Activity', 'Briefcase', 'FlaskConical', 'Stethoscope', 'Users', 'SchoolIcon', 'Star', 'Shield', 'Zap', 'Award', 'BookOpen', 'GraduationCap', 'MapPin', 'Flag', 'Gem'
];

const STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  ...Object.values(ApplicationStatus).map((s) => ({ value: s, label: s })),
];

function SchoolStrategyNotes({
  schoolId,
  notes,
  onUpdateNotes,
}: {
  schoolId: string;
  notes?: string | null;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const [draft, setDraft] = React.useState(notes || '');
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(notes || '');
    }
  }, [schoolId, notes]);

  return (
    <FormField label="Strategy Notes" htmlFor={`notes-${schoolId}`}>
      <Textarea
        id={`notes-${schoolId}`}
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onUpdateNotes(schoolId, next);
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (draft !== (notes || '')) {
            onUpdateNotes(schoolId, draft);
          }
        }}
        placeholder="Why is this a good fit?"
        className="h-20 resize-none"
      />
    </FormField>
  );
}

export const SchoolCard = React.forwardRef<HTMLDivElement, { 
  school: School, 
  status?: ApplicationStatus,
  onDelete?: (id: string) => void, 
  onUpdateNotes?: (id: string, notes: string) => void,
  onUpdateStatus?: (id: string, status: ApplicationStatus | '') => void,
  onViewDetails?: (school: School) => void,
  /** When true (admin/mentor), show Min cGPA / sGPA / DAT on category cards. */
  isMentorView?: boolean,
  isOverlay?: boolean,
  style?: React.CSSProperties,
  attributes?: any,
  listeners?: any
}>(({ school, status, onDelete, onUpdateNotes, onUpdateStatus, onViewDetails, isMentorView, isOverlay, style, attributes, listeners }, ref) => {
  const publicPrivate = school.publicPrivate || '';
  const isPublic = publicPrivate.toLowerCase().includes('public');
  const maleCount = Number(school.maleEnrollment ?? school.male_enrollment ?? 0) || 0;
  const femaleCount = Number(school.femaleEnrollment ?? school.female_enrollment ?? 0) || 0;
  const genderTotal = maleCount + femaleCount;
  const malePct = genderTotal > 0 ? Math.round((maleCount / genderTotal) * 100) : null;
  const femalePct = genderTotal > 0 ? Math.round((femaleCount / genderTotal) * 100) : null;

  const formatStat = (value: unknown) =>
    value != null && value !== '' && !Number.isNaN(Number(value)) ? String(value) : 'N/A';

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-xl border bg-slate-900 p-4 transition-all',
        isOverlay
          ? 'border-indigo-500 shadow-2xl scale-[1.02]'
          : 'border-slate-800 hover:border-indigo-500/30',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {listeners ? (
            <button
              type="button"
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 active:cursor-grabbing"
              aria-label="Drag to move school"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={16} />
            </button>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {publicPrivate ? (
                <Badge variant={isPublic ? 'success' : 'warning'}>{publicPrivate}</Badge>
              ) : null}
              {school.acceptsCanadians ? (
                <Badge variant="primary">Int&apos;l Friendly</Badge>
              ) : null}
            </div>
            <h4 className="text-sm font-semibold leading-snug text-white" title={school.name}>
              {school.name}
            </h4>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin size={12} className="shrink-0 text-indigo-500" />
              <span className="truncate">{school.location}</span>
            </p>
          </div>
        </div>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(school.id)}
            className="h-8 w-8 shrink-0 text-slate-500 hover:text-rose-400"
            aria-label="Delete school"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Avg cGPA', value: formatStat(school.avgGPA ?? school.avg_gpa) },
            { label: 'Avg sGPA', value: formatStat(school.avgSgpa) },
            { label: 'Avg DAT AA', value: formatStat(school.datAvg ?? school.dat_avg) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="min-w-0 rounded-lg border border-slate-800/80 bg-slate-950/60 px-2 py-2 text-center"
            >
              <p className="truncate text-[9px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
        {isMentorView && (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Min cGPA', value: formatStat(school.minCgpa5th ?? school.min_cgpa_5th) },
              { label: 'Min sGPA', value: formatStat(school.minSgpa5th) },
              { label: 'Min DAT AA', value: formatStat(school.minDat5th ?? school.min_dat_5th) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-lg border border-slate-800/80 bg-slate-950/60 px-2 py-2 text-center"
              >
                <p className="truncate text-[9px] font-medium uppercase tracking-wider text-indigo-400/70">
                  {stat.label}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-sky-300">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 space-y-2.5 rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Percent size={14} />
            </div>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Acceptance Rate
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold text-emerald-400">
            {school.acceptanceRate != null ? `${school.acceptanceRate}%` : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <ArrowUpRight size={14} />
            </div>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
              IS Acceptance
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold text-white">
            {school.isAcceptanceRate != null ? `${school.isAcceptanceRate}%` : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <ArrowDownRight size={14} />
            </div>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
              OOS Acceptance
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold text-white">
            {school.oosAcceptanceRate != null ? `${school.oosAcceptanceRate}%` : 'N/A'}
          </span>
        </div>
        <div className="space-y-2 border-t border-slate-800/60 pt-2.5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Gender</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Male</span>
            <span className="text-xs font-semibold text-blue-500">
              {genderTotal > 0 ? `${maleCount} (${malePct}%)` : 'N/A'}
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full bg-blue-500 transition-all duration-700"
              style={{ width: `${genderTotal > 0 ? (maleCount / genderTotal) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-pink-500 transition-all duration-700"
              style={{ width: `${genderTotal > 0 ? (femaleCount / genderTotal) * 100 : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Female</span>
            <span className="text-xs font-semibold text-pink-500">
              {genderTotal > 0 ? `${femaleCount} (${femalePct}%)` : 'N/A'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
              <Calendar size={14} />
            </div>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Deadline
            </span>
          </div>
          <span className="max-w-[55%] shrink-0 truncate text-right text-sm font-semibold text-sky-300">
            {school.deadline || 'TBD'}
          </span>
        </div>
      </div>

      {onViewDetails && (
        <div className="mb-3">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onViewDetails(school)}
          >
            View full details
          </Button>
        </div>
      )}

      {onUpdateStatus && (
        <div className="mb-3 space-y-2 border-t border-slate-800 pt-3">
          <FormField label="Application Status" htmlFor={`status-${school.id}`}>
            <SelectMenu
              value={status || ''}
              onChange={(value) => onUpdateStatus(school.id, value as ApplicationStatus | '')}
              options={STATUS_OPTIONS}
              placeholder="Select status"
              className="w-full"
            />
          </FormField>
        </div>
      )}

      {onUpdateNotes && (
        <div className="min-w-0">
          <SchoolStrategyNotes
            schoolId={school.id}
            notes={typeof school.notes === 'string' ? school.notes : ''}
            onUpdateNotes={onUpdateNotes}
          />
        </div>
      )}
    </div>
  );
});

export const SortableSchoolCard = ({ 
  school, 
  status,
  onDelete, 
  onUpdateNotes,
  onUpdateStatus,
  onViewDetails,
  isMentorView,
}: { 
  school: School, 
  status?: ApplicationStatus,
  onDelete: (id: string) => void, 
  onUpdateNotes: (id: string, notes: string) => void,
  onUpdateStatus: (id: string, status: ApplicationStatus | '') => void,
  onViewDetails?: (school: School) => void,
  isMentorView?: boolean,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: school.id, data: { type: 'school', school } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <SchoolCard 
      ref={setNodeRef}
      school={school}
      status={status}
      onDelete={onDelete}
      onUpdateNotes={onUpdateNotes}
      onUpdateStatus={onUpdateStatus}
      onViewDetails={onViewDetails}
      isMentorView={isMentorView}
      style={style}
      attributes={attributes}
      listeners={listeners}
    />
  );
};

export const MilestoneCard = React.forwardRef<HTMLDivElement, {
  milestone: Milestone,
  onToggle: (id: string) => void,
  onDelete: (id: string) => void,
  isOverlay?: boolean,
  style?: React.CSSProperties,
  attributes?: any,
  listeners?: any
}>(({ milestone, onToggle, onDelete, isOverlay, style, attributes, listeners }, ref) => {
  return (
    <div
      ref={ref}
      style={style}
      {...attributes}
      {...listeners}
      className={`group p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
        isOverlay 
          ? 'border-indigo-500 shadow-2xl scale-[1.02] bg-slate-900' 
          : milestone.status === 'Completed'
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-slate-900 border-slate-800 hover:border-indigo-500/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button 
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggle(milestone.id)}
          className={`mt-0.5 shrink-0 transition-colors ${
            milestone.status === 'Completed' ? 'text-emerald-500' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          {milestone.status === 'Completed' ? <CheckCircle2 size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-current" />}
        </button>
        <p className={`text-sm font-medium flex-1 ${milestone.status === 'Completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
          {milestone.title}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(milestone.id)}
          className="h-7 w-7 shrink-0 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100"
          aria-label="Delete milestone"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
});

export const SortableMilestoneCard = ({ 
  milestone, 
  onToggle, 
  onDelete 
}: { 
  milestone: Milestone, 
  onToggle: (id: string) => void, 
  onDelete: (id: string) => void 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: milestone.id, data: { type: 'milestone', milestone } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <MilestoneCard 
      ref={setNodeRef}
      milestone={milestone}
      onToggle={onToggle}
      onDelete={onDelete}
      style={style}
      attributes={attributes}
      listeners={listeners}
    />
  );
};

export const DroppableMonth = ({ 
  month, 
  children, 
  onAdd,
  customColor,
  onColorChange
}: { 
  month: { label: string, year: number, value: string }, 
  children: React.ReactNode, 
  onAdd: () => void,
  customColor?: string,
  onColorChange: (color: string) => void
}) => {
  const { setNodeRef } = useDroppable({ id: month.value, data: { type: 'month', month } });

  return (
    <div className="flex-1 min-w-[280px] space-y-4">
      <div 
        className="flex flex-col gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/40 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{month.year}</p>
            <h3 
              className="text-lg font-semibold text-white"
              style={customColor ? { color: customColor } : {}}
            >
              {month.label}
            </h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="h-8 w-8"
            aria-label="Add milestone"
          >
            <Plus size={16} />
          </Button>
        </div>

        <div className="flex gap-1.5 pt-1 border-t border-slate-800/50">
          {['#ffffff', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(color => (
            <button
              key={color}
              type="button"
              onClick={(e) => { e.stopPropagation(); onColorChange(color); }}
              className={`w-4 h-4 rounded-full border transition-all ${
                customColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Set month color ${color}`}
            />
          ))}
          {customColor && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onColorChange(''); }}
              className="ml-auto text-[10px] font-medium text-slate-500 hover:text-slate-400 uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={setNodeRef}
        className="min-h-[400px] bg-slate-950/30 border border-slate-800 rounded-xl p-4 space-y-3"
      >
        {children}
      </div>
    </div>
  );
};

export const DroppableCategory = ({ 
  category, 
  children, 
  schoolsCount, 
  onRemove,
  onAdd,
  isDefault 
}: { 
  category: SchoolCategory, 
  children: React.ReactNode, 
  schoolsCount: number, 
  onRemove: (id: string) => void,
  onAdd?: (id: string) => void,
  isDefault: boolean 
}) => {
  const { setNodeRef } = useDroppable({ id: category.id });

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0" style={{ color: category.color }}>
            {ICON_MAP[category.icon] || <SchoolIcon size={16} />}
          </span>
          <h3
            className="truncate text-xs font-semibold uppercase tracking-wider"
            style={{ color: category.color }}
          >
            {category.name}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-500">
            {schoolsCount}
          </span>
          {onAdd && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onAdd(category.id)}
              className="h-7 w-7 text-slate-500 hover:text-indigo-400"
              aria-label={`Add school to ${category.name}`}
            >
              <Plus size={14} />
            </Button>
          )}
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(category.id)}
              className="h-7 w-7 text-slate-600 hover:text-rose-400"
              aria-label="Remove category"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="h-[min(112rem,144vh)] min-w-0 space-y-3 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-3 custom-scrollbar"
      >
        {children}
      </div>
    </div>
  );
};

export interface CentralHubViewProps {
  student: Student;
  experiences: Experience[];
  onUpdateExperiences: (newExps: Experience[]) => void;
  improvementGoals?: ImprovementGoal[];
  milestones?: Milestone[];
  onUpdateMilestones?: (milestones: Milestone[]) => void;
  onUpdateGoal?: (goal: ImprovementGoal) => void;
  onDeleteGoal?: (id: string) => void;
  optimizationPlan?: OptimizationPlan;
  isMentorView?: boolean;
  initialTab?: string;
  onUpdateSchools?: (schools: School[]) => void;
  onUpdateStudent?: (updates: Partial<Student>) => void;
  onUpdateApplications?: (applications: Application[]) => void;
  platformConfig?: PlatformConfig;
  hideShell?: boolean;
}

/** Fallback defaults when API/DB is unavailable. Also used as the catalog for adding sections in admin. */
export const NATIONAL_BENCHMARKS = [
  { label: 'Strength Score', key: 'strengthScore', benchmark: 85, unit: '', description: 'Overall application competitiveness' },
  { label: 'Avg. Response Time', key: 'avgResponseTime', benchmark: 4, unit: 'h', description: 'Engagement and responsiveness' },
  { label: 'DAT Academic Average', key: 'datAA', benchmark: 20.5, unit: '', description: 'Standardized test performance' },
  { label: 'DAT Total Science', key: 'datTS', benchmark: 20.2, unit: '', description: 'Science-specific test score' },
  { label: 'Shadowing Hours', key: 'shadowing', benchmark: 100, unit: 'hrs', description: 'Clinical observation depth' },
  { label: 'Dental Experience', key: 'dental', benchmark: 150, unit: 'hrs', description: 'Hands-on clinical exposure' },
  { label: 'Volunteering', key: 'volunteering', benchmark: 100, unit: 'hrs', description: 'Community service commitment' },
  { label: 'Research Exp.', key: 'research', benchmark: 1, unit: 'exp', description: 'Scientific inquiry involvement' },
  { label: 'Academic Enrichment', key: 'academic', benchmark: 1, unit: 'exp', description: 'Summer programs and workshops' },
  { label: 'Leadership Exp.', key: 'leadership', benchmark: 1, unit: 'exp', description: 'Organizational leadership roles' },
  { label: 'Manual Dexterity', key: 'dexterity', benchmark: 1, unit: 'lvl', description: 'Fine motor skill proficiency' },
] as const;

export type NationalBenchmarkMetricKey = (typeof NATIONAL_BENCHMARKS)[number]['key'];

export const NATIONAL_BENCHMARK_CATALOG = NATIONAL_BENCHMARKS.map((item) => ({ ...item }));

export const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
