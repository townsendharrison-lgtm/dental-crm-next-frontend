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
import { Button, Textarea, FormField } from '@/components/ui';
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

export const DEFAULT_CATEGORIES: SchoolCategory[] = [
  { id: 'Reach', name: 'Reach', color: '#f43f5e', icon: 'Target' },
  { id: 'Target', name: 'Target', color: '#6366f1', icon: 'CheckCircle2' },
  { id: 'Strong Fit', name: 'Strong Fit', color: '#10b981', icon: 'TrendingUp' }
];

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

function formatYesNo(value: boolean | null | undefined) {
  if (value == null) return 'N/A';
  return value ? 'Yes' : 'No';
}

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
  isOverlay?: boolean,
  style?: React.CSSProperties,
  attributes?: any,
  listeners?: any
}>(({ school, status, onDelete, onUpdateNotes, onUpdateStatus, isOverlay, style, attributes, listeners }, ref) => {
  const stats: { label: string; value: React.ReactNode; tone?: string }[] = [
    { label: 'Avg GPA', value: school.avgGPA ?? 'N/A' },
    { label: 'Avg DAT', value: school.datAvg ?? 'N/A' },
    {
      label: 'Acceptance',
      value: school.acceptanceRate != null ? `${school.acceptanceRate}%` : 'N/A',
      tone: 'text-emerald-400',
    },
    { label: 'IS Acc.', value: school.isAcceptanceRate != null ? `${school.isAcceptanceRate}%` : 'N/A' },
    { label: 'OOS Acc.', value: school.oosAcceptanceRate != null ? `${school.oosAcceptanceRate}%` : 'N/A' },
    {
      label: 'CC Credits',
      value: formatYesNo(school.ccCredits),
      tone: school.ccCredits ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      label: 'Length',
      value:
        school.lengthOfSchool != null && school.lengthOfSchool !== ''
          ? `${school.lengthOfSchool} yrs`
          : 'N/A',
    },
    { label: 'Public/Private', value: school.publicPrivate || 'N/A' },
    {
      label: 'CDN DAT',
      value: formatYesNo(school.acceptsCanadianDat),
      tone:
        school.acceptsCanadianDat == null
          ? undefined
          : school.acceptsCanadianDat
            ? 'text-emerald-400'
            : 'text-rose-400',
    },
    {
      label: 'Canadians',
      value: formatYesNo(school.acceptsCanadians),
      tone:
        school.acceptsCanadians == null
          ? undefined
          : school.acceptsCanadians
            ? 'text-emerald-400'
            : 'text-rose-400',
    },
  ];

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
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-white" title={school.name}>
              {school.name}
            </h4>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
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

      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="min-w-0 rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-2"
          >
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
            <p className={cn('mt-0.5 truncate text-xs font-semibold text-white', stat.tone)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {onUpdateStatus && (
        <div className="mb-3 border-t border-slate-800 pt-3">
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
  onUpdateStatus
}: { 
  school: School, 
  status?: ApplicationStatus,
  onDelete: (id: string) => void, 
  onUpdateNotes: (id: string, notes: string) => void,
  onUpdateStatus: (id: string, status: ApplicationStatus | '') => void
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
];

export const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
