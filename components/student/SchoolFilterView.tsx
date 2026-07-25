"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar, 
  Info, 
  ExternalLink, 
  RotateCcw,
  Heart,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  MessageSquare,
  Globe,
  Mail,
  Phone,
  Database,
  Plus,
  X,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDentalSchoolsCatalog } from '@/lib/hooks/useDentalSchoolsCatalog';
import {
  COL_MAP,
  COURSE_REQUIREMENT_FIELDS,
  formatYesNo,
  type CourseRequirementKey,
} from '@/lib/schools/sheetCatalog';
import {
  Button,
  Input,
  SelectMenu,
  Badge,
  EmptyState,
  Card,
  Spinner,
  Tooltip,
} from '@/components/ui';
import { cn } from '@/lib/utils/cn';

export type { DentalSchool } from '@/lib/schools/sheetCatalog';
import type { DentalSchool } from '@/lib/schools/sheetCatalog';

type GenderFilter = 'All' | 'male' | 'female';
type EthnicityFilter = 'All' | 'white' | 'black' | 'hispanic' | 'asian' | 'international';
/** Student has taken the course? Any = don't filter on this class. */
type CourseTakenFilter = 'Any' | 'Yes' | 'No';

const EMPTY_COURSE_FILTERS = Object.fromEntries(
  COURSE_REQUIREMENT_FIELDS.map((f) => [f.key, 'Any' as CourseTakenFilter]),
) as Record<CourseRequirementKey, CourseTakenFilter>;

const COURSE_TAKEN_OPTIONS = [
  { value: 'Any', label: 'Any' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

interface SchoolFilterViewProps {
  onSelectSchool?: (school: DentalSchool) => void;
  isModal?: boolean;
  isMentorView?: boolean;
  /** Start with the favorites-only filter on. */
  favoritesOnly?: boolean;
  /** Open the full-details panel for this catalog school id (or name match). */
  initialSelectedSchoolId?: string | null;
  /** Catalog ids and/or names already on the board — Select is disabled for these. */
  alreadyAddedSchoolKeys?: string[];
}

function acceptsScore(minAccepted: number, userScore: number) {
  // 0 filter = no constraint. Missing school min (0) = keep school.
  if (userScore <= 0) return true;
  if (!minAccepted || minAccepted <= 0) return true;
  return minAccepted <= userScore;
}

function formatPct(count: number, total: number) {
  if (!count || !total) return null;
  return `${((count / total) * 100).toFixed(1)}%`;
}

function schoolGenderPct(school: DentalSchool, gender: GenderFilter) {
  if (gender === 'All') return null;
  const total =
    school.classSize ||
    school.maleEnrollment + school.femaleEnrollment ||
    0;
  const count = gender === 'male' ? school.maleEnrollment : school.femaleEnrollment;
  return formatPct(count, total);
}

function schoolEthnicityPct(school: DentalSchool, ethnicity: EthnicityFilter) {
  if (ethnicity === 'All') return null;
  const { white, black, hispanic, asian, international } = school.ethnicity;
  const total =
    school.classSize || white + black + hispanic + asian + international || 0;
  const count = school.ethnicity[ethnicity] || 0;
  return formatPct(count, total);
}

function ScoreFilterControl({
  label,
  tips,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  tips: string[];
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (next: number) => void;
}) {
  const active = value > 0;
  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-xl border px-2.5 py-2.5 transition-colors',
        active
          ? 'border-indigo-500/30 bg-indigo-500/5'
          : 'border-slate-800/80 bg-slate-950/50',
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">
          <span className="truncate">{label}</span>
          <Tooltip
            side="top"
            content={
              <ul className="space-y-1 text-left font-normal text-slate-300">
                {tips.map((line) => (
                  <li key={line} className="flex gap-1.5">
                    <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            }
          >
            <span className="inline-flex shrink-0 cursor-help text-slate-500 hover:text-indigo-400">
              <Info className="h-3 w-3" />
            </span>
          </Tooltip>
        </span>
        <span
          className={cn(
            'shrink-0 text-[10px] tabular-nums',
            active ? 'text-indigo-300/80' : 'text-slate-600',
          )}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full min-w-0 accent-indigo-500"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value || ''}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(0);
            return;
          }
          const n = parseFloat(raw);
          if (Number.isNaN(n)) return;
          onChange(Math.min(max, Math.max(min, n)));
        }}
        className="mt-2 h-7 w-full min-w-0 rounded-md border border-slate-700/80 bg-slate-900 px-2 text-center text-[11px] font-semibold tabular-nums text-white [appearance:textfield] focus:border-indigo-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label={`${label} typed value`}
      />
    </div>
  );
}

function RangeFilterControl({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-300">{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer',
        active
          ? 'border-indigo-500/40 bg-indigo-500/10 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]'
          : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60',
      )}
    >
      <span
        className={cn(
          'text-xs font-medium leading-snug',
          active ? 'text-indigo-200' : 'text-slate-400',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          active ? 'bg-indigo-500' : 'bg-slate-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            active ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

const SchoolFilterView: React.FC<SchoolFilterViewProps> = ({
  onSelectSchool,
  isModal = false,
  isMentorView = false,
  favoritesOnly = false,
  initialSelectedSchoolId = null,
  alreadyAddedSchoolKeys = [],
}) => {
  const { schools, loading, error, refetch } = useDentalSchoolsCatalog();
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('dsg_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(favoritesOnly);
  const [filters, setFilters] = useState({
    state: 'All',
    type: 'All',
    /** Applicant cGPA — keep schools whose MIN cGPA is at or below this score */
    minCGPA: 0,
    /** Applicant sGPA — keep schools whose MIN sGPA is at or below this score */
    minSGPA: 0,
    /** Applicant DAT — keep schools whose MIN DAT is at or below this score */
    minDAT: 0,
    maxTuition: 1000000,
    minAcceptance: 0,
    minISAcceptance: 0,
    minOOSAcceptance: 0,
    minClassSize: 0,
    acceptsCanadians: 'All',
    acceptsCC: 'All',
    acceptsCanadianDat: 'All',
    gender: 'All' as GenderFilter,
    ethnicity: 'All' as EthnicityFilter,
    minShadowing: 0,
    courses: { ...EMPTY_COURSE_FILTERS },
  });
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState('alphabetical');
  const [selectedSchool, setSelectedSchool] = useState<DentalSchool | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'spreadsheet'>('cards');

  useEffect(() => {
    localStorage.setItem('dsg_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    setShowFavoritesOnly(favoritesOnly);
  }, [favoritesOnly]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to load school data');
    }
  }, [error]);

  useEffect(() => {
    if (!initialSelectedSchoolId || !schools.length) return;
    const match =
      schools.find((s) => s.id === initialSelectedSchoolId) ||
      schools.find(
        (s) => s.name.toLowerCase() === String(initialSelectedSchoolId).toLowerCase(),
      );
    if (match) setSelectedSchool(match);
  }, [initialSelectedSchoolId, schools]);

  // Derived Data
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchesFavorite = !showFavoritesOnly || favorites.includes(s.id);
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                           s.location.toLowerCase().includes(search.toLowerCase());
      const matchesState = filters.state === 'All' || s.location.includes(filters.state);
      const matchesType = filters.type === 'All' || s.type.toLowerCase().includes(filters.type.toLowerCase());
      const matchesCGPA = acceptsScore(s.minCgpa5th, filters.minCGPA);
      const matchesSGPA = acceptsScore(s.minSgpa5th, filters.minSGPA);
      const matchesDAT = acceptsScore(s.minDat5th, filters.minDAT);
      const matchesTuition = s.tuitionRes <= filters.maxTuition;
      const matchesAcceptance = s.acceptanceRate >= filters.minAcceptance;
      const matchesISAcceptance = s.isAcceptanceRate >= filters.minISAcceptance;
      const matchesOOSAcceptance = s.oosAcceptanceRate >= filters.minOOSAcceptance;
      const matchesClassSize = s.classSize >= filters.minClassSize;
      const matchesCanadians = filters.acceptsCanadians === 'All' || 
                               (filters.acceptsCanadians === 'Yes' ? s.canadians : !s.canadians);
      const matchesCC = filters.acceptsCC === 'All' || 
                        (filters.acceptsCC === 'Yes' ? s.ccCredits : !s.ccCredits);
      const matchesCanadianDat =
        filters.acceptsCanadianDat === 'All' ||
        (filters.acceptsCanadianDat === 'Yes'
          ? s.acceptsCanadianDat
          : !s.acceptsCanadianDat);
      const matchesShadowing = s.shadowing >= filters.minShadowing;
      // Gender/ethnicity do not remove schools — they drive accepted-class % on cards.
      // Course filters: if student marks No for a class, hide schools that require it (Yes).
      const matchesCourses = COURSE_REQUIREMENT_FIELDS.every((field) => {
        const taken = filters.courses[field.key];
        if (taken !== 'No') return true;
        return s.courseRequirements?.[field.key] !== true;
      });

      return matchesFavorite && matchesSearch && matchesState && matchesType && matchesCGPA && 
             matchesSGPA && matchesDAT && matchesTuition && matchesAcceptance && 
             matchesISAcceptance && matchesOOSAcceptance &&
             matchesClassSize && matchesCanadians && matchesCC && matchesCanadianDat &&
             matchesShadowing && matchesCourses;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical': return a.name.localeCompare(b.name);
        case 'highest-gpa': return b.cgpa - a.cgpa;
        case 'lowest-gpa': return a.cgpa - b.cgpa;
        case 'highest-dat': return b.datAA - a.datAA;
        case 'lowest-dat': return a.datAA - b.datAA;
        case 'highest-acceptance': return b.acceptanceRate - a.acceptanceRate;
        case 'lowest-acceptance': return a.acceptanceRate - b.acceptanceRate;
        case 'lowest-tuition': return a.tuitionRes - b.tuitionRes;
        case 'highest-tuition': return b.tuitionRes - a.tuitionRes;
        default: return 0;
      }
    });
  }, [schools, search, filters, sortBy, showFavoritesOnly, favorites]);

  // Full spreadsheet dump for staff (admin / mentor / mentor-manager) detail view.
  // Only hide name/location (modal chrome) and per-course Y/N columns (Required coursework grid).
  const rawCategories = useMemo(() => {
    if (!selectedSchool) return null;

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const handled = new Set(
      [
        'school',
        'schoolname',
        'name',
        'location',
        'institution',
        'schoolselectioncorestatsschool',
      ].map(normalize),
    );
    for (const field of COURSE_REQUIREMENT_FIELDS) {
      for (const alias of field.aliases) handled.add(normalize(alias));
      handled.add(normalize(field.label));
    }

    const PREREQ_COURSES = new Set(
      [
        'biochem',
        'homepagebio',
        'biology',
        'bio',
        'gchem',
        'ochem',
        'physics',
        'english',
        'mathstats',
        'math',
        'stats',
        'anatomy',
        'physiology',
        'cellbio',
        'histology',
        'immunology',
        'microbio',
        'geneticsmolecbio',
        'genetics',
        'molecbio',
        'otherreq',
      ].map(normalize),
    );

    type CatKey =
      | 'program'
      | 'academic'
      | 'prereqs'
      | 'admissions'
      | 'financial'
      | 'demographics'
      | 'media'
      | 'contact'
      | 'other';

    const categories: Record<CatKey, { label: string; items: [string, string][] }> = {
      program: { label: 'Program details', items: [] },
      academic: { label: 'Academic stats & requirements', items: [] },
      prereqs: { label: 'Prerequisites & credits', items: [] },
      admissions: { label: 'Admissions & deadlines', items: [] },
      financial: { label: 'Costs & housing', items: [] },
      demographics: { label: 'Class demographics', items: [] },
      media: { label: 'Media & resources', items: [] },
      contact: { label: 'Contact', items: [] },
      other: { label: 'Other', items: [] },
    };

    const prettyLabel = (raw: string) =>
      raw
        .replace(/^Dental School Guide:\s*School Data Catalog\s*/i, '')
        .replace(/^School Selection Core Stats\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    Object.entries(selectedSchool.raw).forEach(([key, value]) => {
      const trimmed = (value || '').toString().trim();
      if (!trimmed || trimmed === 'N/A' || trimmed === '-' || trimmed === '—') return;

      const normalizedKey = normalize(key);
      if (!normalizedKey || handled.has(normalizedKey)) return;

      const displayVal = (() => {
        const yn = formatYesNo(trimmed);
        if ((yn === 'Yes' || yn === 'No') && /^(y|n|yes|no)$/i.test(trimmed)) return yn;
        return trimmed;
      })();

      // Course / prereq policy columns (Y/N subjects live in Required coursework)
      if (
        PREREQ_COURSES.has(normalizedKey) ||
        normalizedKey.includes('prereq') ||
        normalizedKey.includes('requiredclass') ||
        normalizedKey.includes('requiredminimumgrade') ||
        normalizedKey.includes('expirationofclass') ||
        normalizedKey.includes('onlineclass') ||
        normalizedKey.includes('apcredit') ||
        normalizedKey.includes('cccredit')
      ) {
        categories.prereqs.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey.includes('podcast') ||
        normalizedKey.includes('youtube') ||
        normalizedKey.includes('tour') ||
        (normalizedKey.includes('schedule') && normalizedKey.includes('d1')) ||
        normalizedKey.includes('d1schedule')
      ) {
        categories.media.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey.includes('email') ||
        normalizedKey.includes('phone') ||
        normalizedKey.includes('website') ||
        normalizedKey.includes('mailingaddress') ||
        normalizedKey.includes('mailing') ||
        normalizedKey.includes('contact')
      ) {
        categories.contact.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey.includes('tuition') ||
        normalizedKey.includes('fee') ||
        normalizedKey.includes('deposit') ||
        normalizedKey.includes('parking') ||
        normalizedKey.includes('rent') ||
        normalizedKey.includes('housing') ||
        normalizedKey.includes('cost') ||
        normalizedKey.includes('book') ||
        normalizedKey.includes('supplies')
      ) {
        categories.financial.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey === 'men' ||
        normalizedKey === 'women' ||
        normalizedKey.includes('ofmen') ||
        normalizedKey.includes('ofwomen') ||
        normalizedKey.includes('male') ||
        normalizedKey.includes('female') ||
        normalizedKey === 'white' ||
        normalizedKey.includes('africanamerican') ||
        normalizedKey === 'black' ||
        normalizedKey.includes('hispanic') ||
        normalizedKey.includes('latino') ||
        normalizedKey === 'asian' ||
        normalizedKey.includes('international') ||
        normalizedKey.includes('ethnicity') ||
        normalizedKey.includes('gender') ||
        normalizedKey.includes('classsize') ||
        normalizedKey.includes('enrollment')
      ) {
        categories.demographics.items.push([prettyLabel(key), displayVal]);
        return;
      }

      // Deadlines / admissions process (before academic "dat" catch-all)
      if (
        normalizedKey.includes('deadline') ||
        normalizedKey.includes('applicant') ||
        normalizedKey.includes('acceptance') ||
        normalizedKey.includes('admission') ||
        normalizedKey.includes('interview') ||
        normalizedKey.includes('casper') ||
        normalizedKey.includes('letter') ||
                        normalizedKey.includes('canadian') ||
        normalizedKey.includes('nonus') ||
        normalizedKey.includes('additionalinfo')
      ) {
        categories.admissions.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey.includes('length') ||
        normalizedKey.includes('publicprivate') ||
        normalizedKey.includes('publicorprivate') ||
        normalizedKey.includes('specialty') ||
        normalizedKey.includes('grading') ||
        normalizedKey.includes('mission')
      ) {
        categories.program.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey.includes('gpa') ||
        normalizedKey.includes('dat') ||
        normalizedKey.includes('pat') ||
        normalizedKey.includes('shadow') ||
        normalizedKey.includes('score') ||
        normalizedKey.includes('meants') ||
        normalizedKey === 'ts'
      ) {
        categories.academic.items.push([prettyLabel(key), displayVal]);
        return;
      }

      if (
        normalizedKey.includes('link') ||
        normalizedKey.includes('url') ||
        normalizedKey.includes('http')
      ) {
        categories.contact.items.push([prettyLabel(key), displayVal]);
        return;
      }

      categories.other.items.push([prettyLabel(key), displayVal]);
    });

    return categories;
  }, [selectedSchool]);

  const states = useMemo(() => {
    const s = new Set(schools.map(sch => {
      const parts = sch.location.split(',');
      return parts[parts.length - 1].trim();
    }));
    return ['All', ...Array.from(s).sort()];
  }, [schools]);

  const addedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const key of alreadyAddedSchoolKeys) {
      const k = String(key || '').trim();
      if (!k) continue;
      set.add(k);
      set.add(k.toLowerCase());
    }
    return set;
  }, [alreadyAddedSchoolKeys]);

  const isAlreadyAdded = (school: DentalSchool) =>
    addedKeys.has(school.id) ||
    addedKeys.has(school.id.toLowerCase()) ||
    addedKeys.has(school.name) ||
    addedKeys.has(school.name.toLowerCase());

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const activeCourseFilters = useMemo(
    () => COURSE_REQUIREMENT_FIELDS.filter((f) => filters.courses[f.key] !== 'Any').length,
    [filters.courses],
  );
  const moreFiltersActive =
    filters.gender !== 'All' || filters.ethnicity !== 'All' || activeCourseFilters > 0;

  const resetFilters = () => {
    setFilters({
      state: 'All',
      type: 'All',
      minCGPA: 0,
      minSGPA: 0,
      minDAT: 0,
      maxTuition: 1000000,
      minAcceptance: 0,
      minISAcceptance: 0,
      minOOSAcceptance: 0,
      minClassSize: 0,
      acceptsCanadians: 'All',
      acceptsCC: 'All',
      acceptsCanadianDat: 'All',
      gender: 'All',
      ethnicity: 'All',
      minShadowing: 0,
      courses: { ...EMPTY_COURSE_FILTERS },
    });
    setSearch('');
    setSortBy('alphabetical');
  };

  const setCourseTaken = (key: CourseRequirementKey, value: CourseTakenFilter) => {
    setFilters((prev) => ({
      ...prev,
      courses: { ...prev.courses, [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Spinner className="h-8 w-8 text-indigo-500" />
        <p className="text-sm text-slate-500">Fetching live school data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<XCircle className="w-8 h-8 text-rose-500" />}
        title="Connection Error"
        description={error}
        action={
          <Button onClick={() => void refetch()} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Try Again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Dental School Catalog</h2>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" /> Live data from the national dental school database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-lg px-3 py-1.5 text-sm font-medium">
            <span className="text-indigo-400">{filteredSchools.length}</span>
            <span className="text-slate-400 ml-1">Schools Found</span>
          </Badge>
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('cards')}
              className="h-8 px-3 text-xs"
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'spreadsheet' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('spreadsheet')}
              className="h-8 px-3 text-xs"
            >
              Spreadsheet
            </Button>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={resetFilters}
            title="Reset Filters"
            className="h-9 w-9"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        {/* Top Filters Section */}
        <Card className="relative overflow-hidden border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-0 shadow-xl shadow-black/20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-violet-500/5 blur-3xl" />

          <div className="relative space-y-4 p-4 sm:p-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-indigo-400/80" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by school name, state, or keywords..."
                className="h-11 rounded-xl border-slate-800/80 bg-slate-950/80 pl-10 shadow-inner shadow-black/20 focus:border-indigo-500/50"
              />
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
              {/* Location & Type */}
              <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3 xl:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Basics
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                    Location
                  </label>
                  <SelectMenu
                    value={filters.state}
                    onChange={(v) => setFilters({ ...filters, state: v })}
                    options={states.map((s) => ({ value: s, label: s }))}
                    className="h-9 rounded-xl border-slate-800 bg-slate-900/80 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                    School Type
                  </label>
                  <SelectMenu
                    value={filters.type}
                    onChange={(v) => setFilters({ ...filters, type: v })}
                    options={[
                      { value: 'All', label: 'All Types' },
                      { value: 'Public', label: 'Public' },
                      { value: 'Private', label: 'Private' },
                    ]}
                    className="h-9 rounded-xl border-slate-800 bg-slate-900/80 text-xs"
                  />
                </div>
              </div>

              {/* GPA / sGPA / DAT */}
              <div className="min-w-0 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3 xl:col-span-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Your scores
                </p>
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                  <ScoreFilterControl
                    label="GPA"
                    tips={[
                      'Enter your cumulative GPA (cGPA).',
                      'Schools with a higher minimum accepted cGPA are hidden.',
                      'Leave at 0 / Any to skip this filter.',
                    ]}
                    value={filters.minCGPA}
                    min={0}
                    max={4}
                    step={0.01}
                    display={filters.minCGPA > 0 ? filters.minCGPA.toFixed(2) : 'Any'}
                    onChange={(n) => setFilters({ ...filters, minCGPA: n })}
                  />
                  <ScoreFilterControl
                    label="sGPA"
                    tips={[
                      'Enter your science GPA (sGPA).',
                      'Schools with a higher minimum accepted sGPA are hidden.',
                      'Leave at 0 / Any to skip this filter.',
                    ]}
                    value={filters.minSGPA}
                    min={0}
                    max={4}
                    step={0.01}
                    display={filters.minSGPA > 0 ? filters.minSGPA.toFixed(2) : 'Any'}
                    onChange={(n) => setFilters({ ...filters, minSGPA: n })}
                  />
                  <ScoreFilterControl
                    label="DAT"
                    tips={[
                      'Enter your DAT Academic Average score.',
                      'Schools with a higher minimum accepted DAT are hidden.',
                      'Supports the new 3-digit scale up to 600.',
                    ]}
                    value={filters.minDAT}
                    min={0}
                    max={600}
                    step={1}
                    display={filters.minDAT > 0 ? String(filters.minDAT) : 'Any'}
                    onChange={(n) => setFilters({ ...filters, minDAT: Math.round(n) })}
                  />
                </div>
              </div>

              {/* Acceptance & tuition */}
              <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3 xl:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Acceptance &amp; cost
                </p>
                <RangeFilterControl
                  label="Min Acceptance"
                  value={filters.minAcceptance}
                  display={`${filters.minAcceptance}%`}
                  min={0}
                  max={30}
                  step={0.5}
                  onChange={(n) => setFilters({ ...filters, minAcceptance: n })}
                />
                <RangeFilterControl
                  label="Min IS Acceptance"
                  value={filters.minISAcceptance}
                  display={`${filters.minISAcceptance}%`}
                  min={0}
                  max={50}
                  step={0.5}
                  onChange={(n) => setFilters({ ...filters, minISAcceptance: n })}
                />
                <RangeFilterControl
                  label="Min OOS Acceptance"
                  value={filters.minOOSAcceptance}
                  display={`${filters.minOOSAcceptance}%`}
                  min={0}
                  max={30}
                  step={0.5}
                  onChange={(n) => setFilters({ ...filters, minOOSAcceptance: n })}
                />
                <RangeFilterControl
                  label="Max Tuition"
                  value={filters.maxTuition}
                  display={`$${(filters.maxTuition / 1000).toFixed(0)}k`}
                  min={0}
                  max={150000}
                  step={5000}
                  onChange={(n) => setFilters({ ...filters, maxTuition: n })}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-3 xl:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Eligibility
                </p>
                <FilterToggle
                  label="Accepts Canadians"
                  active={filters.acceptsCanadians === 'Yes'}
                  onToggle={() =>
                    setFilters({
                      ...filters,
                      acceptsCanadians: filters.acceptsCanadians === 'Yes' ? 'All' : 'Yes',
                    })
                  }
                />
                <FilterToggle
                  label="Accepts CC Credits"
                  active={filters.acceptsCC === 'Yes'}
                  onToggle={() =>
                    setFilters({
                      ...filters,
                      acceptsCC: filters.acceptsCC === 'Yes' ? 'All' : 'Yes',
                    })
                  }
                />
                <FilterToggle
                  label="Accepts Canadian DAT"
                  active={filters.acceptsCanadianDat === 'Yes'}
                  onToggle={() =>
                    setFilters({
                      ...filters,
                      acceptsCanadianDat:
                        filters.acceptsCanadianDat === 'Yes' ? 'All' : 'Yes',
                    })
                  }
                />
              </div>
            </div>

            {/* Expandable student profile filters */}
            <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setMoreFiltersOpen((o) => !o)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900/40"
              >
                <span className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-slate-200">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                  Filter more
                  <span className="text-xs font-normal text-slate-500">
                    Gender, ethnicity &amp; courses
                  </span>
                  {moreFiltersActive && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {(filters.gender !== 'All' ? 1 : 0) +
                        (filters.ethnicity !== 'All' ? 1 : 0) +
                        activeCourseFilters}{' '}
                      active
                    </Badge>
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-slate-500 transition-transform',
                    moreFiltersOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {moreFiltersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 border-t border-slate-800/80 px-4 py-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-[7.5rem] space-y-1.5">
                          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                            Gender
                          </label>
                          <SelectMenu
                            value={filters.gender}
                            onChange={(v) =>
                              setFilters({ ...filters, gender: v as GenderFilter })
                            }
                            options={[
                              { value: 'All', label: 'Any' },
                              { value: 'male', label: 'Male' },
                              { value: 'female', label: 'Female' },
                            ]}
                            className="h-8 rounded-lg border-slate-800 bg-slate-900/90 px-2.5 text-xs"
                          />
                        </div>
                        <div className="w-[8.5rem] space-y-1.5">
                          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                            Ethnicity
                          </label>
                          <SelectMenu
                            value={filters.ethnicity}
                            onChange={(v) =>
                              setFilters({ ...filters, ethnicity: v as EthnicityFilter })
                            }
                            options={[
                              { value: 'All', label: 'Any' },
                              { value: 'white', label: 'White' },
                              { value: 'black', label: 'Black' },
                              { value: 'hispanic', label: 'Hisp.' },
                              { value: 'asian', label: 'Asian' },
                              { value: 'international', label: 'Intl.' },
                            ]}
                            className="h-8 rounded-lg border-slate-800 bg-slate-900/90 px-2.5 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-300">
                            Classes the student has taken
                          </p>
                          {activeCourseFilters > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  courses: { ...EMPTY_COURSE_FILTERS },
                                }))
                              }
                              className="cursor-pointer text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                            >
                              Clear courses
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          {COURSE_REQUIREMENT_FIELDS.map((field) => (
                            <div
                              key={field.key}
                              className="space-y-1.5 rounded-xl border border-slate-800/70 bg-slate-950/50 p-2"
                            >
                              <label className="block truncate text-[10px] font-medium uppercase tracking-widest text-slate-500">
                                {field.label}
                              </label>
                              <SelectMenu
                                value={filters.courses[field.key]}
                                onChange={(v) =>
                                  setCourseTaken(field.key, v as CourseTakenFilter)
                                }
                                options={COURSE_TAKEN_OPTIONS}
                                className="h-8 rounded-lg border-slate-800 bg-slate-900/90 px-2.5 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Card>

        {/* Main Content Area (Full Width) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:flex-1">
              <div className="flex items-center gap-2 w-full sm:w-64">
                <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
                <SelectMenu
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'alphabetical', label: 'Sort by: Alphabetical' },
                    { value: 'highest-gpa', label: 'Sort by: Highest GPA' },
                    { value: 'lowest-gpa', label: 'Sort by: Lowest GPA' },
                    { value: 'highest-dat', label: 'Sort by: Highest DAT' },
                    { value: 'lowest-dat', label: 'Sort by: Lowest DAT' },
                    { value: 'highest-acceptance', label: 'Sort by: Highest Acceptance' },
                    { value: 'lowest-acceptance', label: 'Sort by: Lowest Acceptance' },
                    { value: 'lowest-tuition', label: 'Sort by: Lowest Tuition' },
                    { value: 'highest-tuition', label: 'Sort by: Highest Tuition' },
                  ]}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant={showFavoritesOnly ? 'primary' : 'outline'}
                leftIcon={<Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-current' : ''}`} />}
                onClick={() => setShowFavoritesOnly((v) => !v)}
              >
                Favorites{favorites.length ? ` (${favorites.length})` : ''}
              </Button>
            </div>
          </div>

          {viewMode === 'cards' ? (
            filteredSchools.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                <AnimatePresence mode="popLayout">
                  {filteredSchools.map((school) => (
                    <motion.div
                      layout
                      key={school.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="group relative flex h-full min-h-[520px] flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex h-full flex-col p-4 space-y-4 relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-start gap-3 shrink-0">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
                              <Badge variant={school.type.includes('Public') ? 'success' : 'warning'}>
                                {school.type}
                              </Badge>
                              {school.canadians && (
                                <Badge variant="primary">Int&apos;l Friendly</Badge>
                              )}
                            </div>
                            <h4 className="text-base font-semibold text-white leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-indigo-300 transition-colors">{school.name}</h4>
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> {school.location}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(school.id);
                            }}
                            className={`h-9 w-9 shrink-0 ${favorites.includes(school.id) ? 'text-rose-500 hover:text-rose-400' : 'text-slate-600 hover:text-rose-500'}`}
                          >
                            <Heart className={`w-4 h-4 ${favorites.includes(school.id) ? 'fill-current' : ''}`} />
                          </Button>
                        </div>

                        {/* Stats Grid */}
                        <div className={`grid ${isMentorView ? 'grid-cols-3' : 'grid-cols-2'} gap-2 shrink-0`}>
                          {(isMentorView
                            ? [
                                { label: 'Avg cGPA', value: school.cgpa || 'N/A', color: 'text-white' },
                                { label: 'Avg sGPA', value: school.sgpa || 'N/A', color: 'text-white' },
                                { label: 'Avg DAT AA', value: school.datAA || 'N/A', color: 'text-white' },
                                { label: 'Min cGPA', value: school.minCgpa5th || 'N/A', color: 'text-indigo-400' },
                                { label: 'Min sGPA', value: school.minSgpa5th || 'N/A', color: 'text-indigo-400' },
                                { label: 'Min DAT AA', value: school.minDat5th || 'N/A', color: 'text-indigo-400' },
                              ]
                            : [
                                { label: 'Mean cGPA', value: school.cgpa || 'N/A', color: 'text-white' },
                                { label: 'DAT AA', value: school.datAA || 'N/A', color: 'text-white' },
                                {
                                  label: 'Acceptance',
                                  value: school.acceptanceRate ? `${school.acceptanceRate}%` : 'N/A',
                                  color: 'text-emerald-400',
                                },
                                { label: 'Class Size', value: school.classSize || 'N/A', color: 'text-white' },
                                {
                                  label: 'Length of School',
                                  value: school.lengthOfSchool ? `${school.lengthOfSchool} yrs` : 'N/A',
                                  color: 'text-white',
                                },
                                {
                                  label: 'Public/Private',
                                  value: school.type || 'N/A',
                                  color: 'text-white',
                                },
                                {
                                  label: 'Acc. Canadian DAT',
                                  value: school.acceptsCanadianDat ? 'Yes' : 'No',
                                  color: school.acceptsCanadianDat ? 'text-emerald-400' : 'text-rose-400',
                                },
                                {
                                  label: 'Accepts Canadians',
                                  value: school.canadians ? 'Yes' : 'No',
                                  color: school.canadians ? 'text-emerald-400' : 'text-rose-400',
                                },
                              ]
                          ).map((stat, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/50 min-h-[58px] flex flex-col items-center justify-center text-center"
                            >
                              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1 truncate w-full">
                                {stat.label}
                              </p>
                              <p className={`text-sm font-semibold truncate w-full ${stat.color}`}>
                                {stat.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Secondary Info */}
                        <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/40 space-y-3 shrink-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">IS Acceptance</span>
                            </div>
                            <span className="text-sm font-semibold text-white shrink-0">{school.isAcceptanceRate ? `${school.isAcceptanceRate}%` : 'N/A'}</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">OOS Acceptance</span>
                            </div>
                            <span className="text-sm font-semibold text-white shrink-0">{school.oosAcceptanceRate ? `${school.oosAcceptanceRate}%` : 'N/A'}</span>
                          </div>

                          {filters.gender !== 'All' && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                                  <Users className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">
                                  {filters.gender === 'male' ? 'Male' : 'Female'} Accepted
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-violet-300 shrink-0">
                                {schoolGenderPct(school, filters.gender) || 'N/A'}
                              </span>
                            </div>
                          )}

                          {filters.ethnicity !== 'All' && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                                  <Users className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">
                                  {filters.ethnicity === 'white'
                                    ? 'White'
                                    : filters.ethnicity === 'black'
                                      ? 'Black'
                                      : filters.ethnicity === 'hispanic'
                                        ? 'Hispanic'
                                        : filters.ethnicity === 'asian'
                                          ? 'Asian'
                                          : 'International'}{' '}
                                  Accepted
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-cyan-300 shrink-0">
                                {schoolEthnicityPct(school, filters.ethnicity) || 'N/A'}
                              </span>
                            </div>
                          )}

                          <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-400 shrink-0">
                                <Calendar className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">Deadline</span>
                            </div>
                            <span className="text-sm font-semibold text-indigo-400 shrink-0 truncate max-w-[50%] text-right">{school.deadline || 'TBD'}</span>
                          </div>
                        </div>

                        <div className="mt-auto flex gap-2 pt-1 shrink-0">
                          <Button
                            variant={onSelectSchool ? 'secondary' : 'primary'}
                            size="sm"
                            className="flex-1"
                            leftIcon={<Info className="w-4 h-4" />}
                            onClick={() => setSelectedSchool(school)}
                          >
                            {onSelectSchool ? 'Details' : 'View Full Details'}
                          </Button>
                          {onSelectSchool && (
                            <Button
                              size="sm"
                              className="flex-1"
                              leftIcon={<Plus className="w-4 h-4" />}
                              disabled={isAlreadyAdded(school)}
                              title={
                                isAlreadyAdded(school)
                                  ? 'Already on your school list'
                                  : 'Add to this category'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAlreadyAdded(school)) return;
                                onSelectSchool(school);
                              }}
                            >
                              {isAlreadyAdded(school) ? 'Added' : 'Select'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="No Schools Match Your Filters"
                description="Try adjusting your criteria or resetting the filters to explore more options."
                action={
                  <Button onClick={resetFilters}>Reset All Filters</Button>
                }
              />
            )
          ) : (
            /* Spreadsheet View */
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="overflow-x-auto overflow-y-auto max-h-[700px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-950">
                      <th className="p-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap sticky top-0 left-0 bg-slate-950 z-40 border-b border-r border-slate-800 w-24 min-w-[96px]">Actions</th>
                      {schools.length > 0 && Object.keys(schools[0].raw).filter(header => {
                        if (isMentorView) return true;
                        const h = header.toLowerCase().trim();
                        const isMinGpa = COL_MAP.minCgpa5th.some(k => k.toLowerCase().trim() === h);
                        const isMinDat = COL_MAP.minDat5th.some(k => k.toLowerCase().trim() === h);
                        return !isMinGpa && !isMinDat;
                      }).map(header => {
                        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const isSchool =
                          (COL_MAP.name as readonly string[]).includes(header) ||
                          normalizedHeader === 'school' ||
                          (normalizedHeader.endsWith('school') && !normalizedHeader.includes('length'));
                        return (
                          <th 
                            key={header} 
                            className={`p-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-r border-slate-800/80 bg-slate-950 sticky top-0 z-30 ${isSchool ? 'left-24 z-40 border-r border-slate-800' : ''}`}
                          >
                            {header === 'School Selection Core Stats School' ? 'School' : header}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map((school, idx) => {
                      const rowBg = idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950';
                      const stickyBg = idx % 2 === 0
                        ? 'bg-slate-900 group-hover:bg-indigo-950'
                        : 'bg-slate-950 group-hover:bg-indigo-950';
                      return (
                      <tr 
                        key={school.id} 
                        className={`group border-b border-slate-800/80 transition-colors hover:bg-indigo-950 ${rowBg}`}
                      >
                        <td className={`p-3 sticky left-0 z-20 border-r border-slate-800 w-24 min-w-[96px] ${stickyBg}`}>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-indigo-400 hover:text-white hover:bg-indigo-600"
                              onClick={() => setSelectedSchool(school)}
                              title="View Details"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-7 w-7 ${favorites.includes(school.id) ? 'text-rose-500' : 'text-slate-600 hover:text-rose-500'}`}
                              onClick={() => toggleFavorite(school.id)}
                            >
                              <Heart className={`w-3.5 h-3.5 ${favorites.includes(school.id) ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </td>
                        {Object.entries(school.raw).filter(([key]) => {
                          if (isMentorView) return true;
                          const h = key.toLowerCase().trim();
                          const isMinGpa = COL_MAP.minCgpa5th.some(k => k.toLowerCase().trim() === h);
                          const isMinDat = COL_MAP.minDat5th.some(k => k.toLowerCase().trim() === h);
                          return !isMinGpa && !isMinDat;
                        }).map(([key, val], i) => {
                          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                          const isSchool =
                            (COL_MAP.name as readonly string[]).includes(key) ||
                            normalizedKey === 'school' ||
                            (normalizedKey.endsWith('school') && !normalizedKey.includes('length'));
                          const valStr = val?.toString() || '';
                          const isLink = valStr.startsWith('http://') || valStr.startsWith('https://');
                          const isEmail = (COL_MAP.email as readonly string[]).includes(key) || (valStr.includes('@') && valStr.includes('.') && !valStr.includes(' '));
                          const ynLabel = formatYesNo(valStr);
                          const isYn =
                            !isLink &&
                            !isEmail &&
                            (ynLabel === 'Yes' || ynLabel === 'No') &&
                            /^(y|n|yes|no)$/i.test(valStr.trim());
                          const display = isYn ? ynLabel : valStr;
                          
                          return (
                            <td 
                              key={i} 
                              className={`p-3 text-xs font-medium text-slate-300 whitespace-nowrap border-r border-slate-800/80 max-w-[300px] truncate ${
                                isSchool
                                  ? `sticky left-24 z-20 border-r border-slate-800 font-semibold text-white ${stickyBg}`
                                  : ''
                              }`}
                            >
                              {isLink ? (
                                <a 
                                  href={valStr} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
                                >
                                  {display}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : isEmail ? (
                                <a 
                                  href={`mailto:${valStr}`}
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
                                >
                                  {display}
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                display
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredSchools.length === 0 && (
                <EmptyState
                  className="border-0 rounded-none"
                  title="No schools match your filters."
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSchool && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-start shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={selectedSchool.type.includes('Public') ? 'success' : 'warning'}>
                      {selectedSchool.type}
                    </Badge>
                    <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                      <MapPin className="w-4 h-4" /> {selectedSchool.location}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-white leading-tight">{selectedSchool.name}</h3>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedSchool(null)}
                  className="h-9 w-9 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Stats Overview */}
                  <div className="md:col-span-2 space-y-6">
                    <div className={`grid gap-2 sm:gap-3 ${isMentorView ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Avg<br/>cGPA</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.cgpa || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Avg<br/>sGPA</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.sgpa || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Avg<br/>DAT AA</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.datAA || 'N/A'}</p>
                      </div>
                      {isMentorView && (
                        <>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                            <p className="text-[9px] sm:text-[10px] font-medium text-indigo-400/70 uppercase tracking-wider leading-tight mb-2">Min cGPA<br/>(5%)</p>
                            <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.minCgpa5th || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                            <p className="text-[9px] sm:text-[10px] font-medium text-indigo-400/70 uppercase tracking-wider leading-tight mb-2">Min sGPA<br/>(5%)</p>
                            <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.minSgpa5th || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                            <p className="text-[9px] sm:text-[10px] font-medium text-indigo-400/70 uppercase tracking-wider leading-tight mb-2">Min DAT<br/>(5%)</p>
                            <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.minDat5th || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                            <p className="text-[9px] sm:text-[10px] font-medium text-emerald-400/70 uppercase tracking-wider leading-tight mb-2">Max cGPA<br/>(95%)</p>
                            <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.maxCgpa95th || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                            <p className="text-[9px] sm:text-[10px] font-medium text-emerald-400/70 uppercase tracking-wider leading-tight mb-2">Max sGPA<br/>(95%)</p>
                            <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.maxSgpa95th || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                            <p className="text-[9px] sm:text-[10px] font-medium text-emerald-400/70 uppercase tracking-wider leading-tight mb-2">Max DAT<br/>(95%)</p>
                            <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.maxDat95th || 'N/A'}</p>
                          </div>
                        </>
                      )}
                      {!isMentorView && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                          <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Acceptance</p>
                          <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.acceptanceRate ? `${selectedSchool.acceptanceRate}%` : 'N/A'}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-base font-semibold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" /> Enrollment & Demographics
                      </h5>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                          {/* Residency Breakdown */}
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Residency & Acceptance</p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">In-State Acceptance Rate</span>
                                <span className="text-sm font-semibold text-emerald-400">
                                  {selectedSchool.isAcceptanceRate
                                    ? `${selectedSchool.isAcceptanceRate}%`
                                    : "N/A"}
                                </span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                                <div
                                  className="bg-emerald-500 h-full transition-all duration-1000"
                                  style={{
                                    width: `${
                                      ((selectedSchool.isAcceptanceRate || 0) /
                                        Math.max(
                                          1,
                                          (selectedSchool.isAcceptanceRate || 0) +
                                            (selectedSchool.oosAcceptanceRate || 0),
                                        )) *
                                      100
                                    }%`,
                                  }}
                                />
                                <div
                                  className="bg-amber-500 h-full transition-all duration-1000"
                                  style={{
                                    width: `${
                                      ((selectedSchool.oosAcceptanceRate || 0) /
                                        Math.max(
                                          1,
                                          (selectedSchool.isAcceptanceRate || 0) +
                                            (selectedSchool.oosAcceptanceRate || 0),
                                        )) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Out-of-State Acceptance Rate</span>
                                <span className="text-sm font-semibold text-amber-400">
                                  {selectedSchool.oosAcceptanceRate
                                    ? `${selectedSchool.oosAcceptanceRate}%`
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Gender Breakdown */}
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Gender</p>
                            <div className="space-y-3">
                              {(() => {
                                const male = Number(selectedSchool.maleEnrollment) || 0;
                                const female = Number(selectedSchool.femaleEnrollment) || 0;
                                const total = male + female;
                                const malePct = total > 0 ? Math.round((male / total) * 100) : null;
                                const femalePct = total > 0 ? Math.round((female / total) * 100) : null;
                                return (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-400">Male</span>
                                      <span className="text-sm font-semibold text-blue-500">
                                        {selectedSchool.maleEnrollment != null
                                          ? malePct != null
                                            ? `${male} (${malePct}%)`
                                            : `${male}`
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                                      <div
                                        className="bg-blue-500 h-full transition-all duration-1000"
                                        style={{
                                          width: `${total > 0 ? (male / total) * 100 : 0}%`,
                                        }}
                                      />
                                      <div
                                        className="bg-pink-500 h-full transition-all duration-1000"
                                        style={{
                                          width: `${total > 0 ? (female / total) * 100 : 0}%`,
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-400">Female</span>
                                      <span className="text-sm font-semibold text-pink-500">
                                        {selectedSchool.femaleEnrollment != null
                                          ? femalePct != null
                                            ? `${female} (${femalePct}%)`
                                            : `${female}`
                                          : "N/A"}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Ethnicity & International Breakdown */}
                        <div className="pt-4 border-t border-slate-800/50 space-y-3">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Ethnicity & International Breakdown</p>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-800/50 text-center">
                              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">White</p>
                              <p className="text-sm font-semibold text-white">{selectedSchool.ethnicity.white || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-800/50 text-center">
                              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Black</p>
                              <p className="text-sm font-semibold text-white">{selectedSchool.ethnicity.black || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-800/50 text-center">
                              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Hispanic</p>
                              <p className="text-sm font-semibold text-white">{selectedSchool.ethnicity.hispanic || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-800/50 text-center">
                              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Asian</p>
                              <p className="text-sm font-semibold text-white">{selectedSchool.ethnicity.asian || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-800/50 text-center">
                              <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">International</p>
                              <p className="text-sm font-semibold text-white">{selectedSchool.ethnicity.international || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-base font-semibold text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" /> Academic Requirements
                      </h5>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          {isMentorView && (
                            <>
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Prerequisites</p>
                                <p className="text-sm text-slate-300 leading-relaxed">{selectedSchool.prereqs || 'No specific prerequisites listed.'}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Shadowing Hours</p>
                                <p className="text-sm text-slate-300 leading-relaxed">Minimum required: <span className="text-white font-semibold">{selectedSchool.shadowing || '0'} hours</span></p>
                              </div>
                            </>
                          )}
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Community College Credits</p>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {selectedSchool.ccCredits ? (
                                <span className="flex items-center gap-2 text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-4 h-4" /> Accepted
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-rose-400 font-semibold">
                                  <XCircle className="w-4 h-4" /> Not Accepted / Info Unavailable
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isMentorView && (
                          <div className="pt-4 border-t border-slate-800/50">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">DAT & GPA Stats</p>
                            <div className="flex flex-wrap gap-2">
                              <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
                                <span className="text-xs text-slate-500 mr-2">AA:</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.datAA || 'N/A'}</span>
                              </div>
                              <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
                                <span className="text-xs text-slate-500 mr-2">PAT:</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.datPAT || 'N/A'}</span>
                              </div>
                              <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
                                <span className="text-xs text-slate-500 mr-2">TS:</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.datTS || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/50">
                                <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Min Accepted DAT (5th%)</p>
                                <p className="text-sm font-semibold text-white">{selectedSchool.minDat5th || 'N/A'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/50">
                                <p className="text-[10px] font-medium text-slate-500 uppercase mb-1">Min Accepted cGPA (5th%)</p>
                                <p className="text-sm font-semibold text-white">{selectedSchool.minCgpa5th || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {isMentorView && (
                      <div className="space-y-4">
                        <h5 className="text-base font-semibold text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-indigo-400" /> Admissions & Interview
                        </h5>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Interview Format</p>
                              <p className="text-sm text-slate-300">{selectedSchool.interview || 'Information not available.'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">Deadlines</p>
                              <p className="text-sm text-slate-300">Application: <span className="text-white font-semibold">{selectedSchool.deadline || 'TBD'}</span></p>
                            </div>
                          </div>
                          {(selectedSchool.secondaryFee || selectedSchool.deposit || selectedSchool.casper) && (
                            <div className="pt-3 border-t border-slate-800 space-y-2">
                              {selectedSchool.secondaryFee && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Secondary Fee</span>
                                  <span className="text-white font-semibold">{selectedSchool.secondaryFee}</span>
                                </div>
                              )}
                              {selectedSchool.deposit && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Seat Deposit</span>
                                  <span className="text-white font-semibold">{selectedSchool.deposit}</span>
                                </div>
                              )}
                              {selectedSchool.casper && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Casper/Altus</span>
                                  <span className="text-white font-semibold">{selectedSchool.casper}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {selectedSchool.podcast && (
                            <div className="pt-3 border-t border-slate-800">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Podcast with Dean of Admissions</p>
                              {selectedSchool.podcast.startsWith('http') ? (
                                <a 
                                  href={selectedSchool.podcast}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-2 font-medium"
                                >
                                  <ExternalLink className="w-4 h-4" /> Listen to Podcast
                                </a>
                              ) : (
                                <p className="text-sm text-slate-300">{selectedSchool.podcast}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isMentorView && (
                      <div className="space-y-4">
                        <h5 className="text-base font-semibold text-white flex items-center gap-2">
                          <Info className="w-4 h-4 text-indigo-400" /> Additional Details
                        </h5>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                          {selectedSchool.mission && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Mission Statement</p>
                              <p className="text-sm text-slate-300 leading-relaxed italic">&ldquo;{selectedSchool.mission}&rdquo;</p>
                            </div>
                          )}
                          {selectedSchool.letters && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Letters of Recommendation</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{selectedSchool.letters}</p>
                            </div>
                          )}
                          {(selectedSchool.email || selectedSchool.phone) && (
                            <div className="pt-3 border-t border-slate-800 space-y-2">
                              {selectedSchool.email && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Mail className="w-4 h-4 text-slate-500" />
                                  <span className="text-indigo-400 font-medium">{selectedSchool.email}</span>
                                </div>
                              )}
                              {selectedSchool.phone && (
                                <div className="flex items-center gap-3 text-sm">
                                  <Phone className="w-4 h-4 text-slate-500" />
                                  <span className="text-slate-300">{selectedSchool.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedSchool.courseRequirements && (
                      <div className="space-y-3">
                        <h5 className="text-base font-semibold text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-400" /> Required coursework
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                          {COURSE_REQUIREMENT_FIELDS.map((field) => {
                            const required = selectedSchool.courseRequirements?.[field.key];
                            const label = formatYesNo(required);
                            return (
                              <div
                                key={field.key}
                                className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-center"
                              >
                                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 truncate">
                                  {field.label}
                                </p>
                                <p
                                  className={cn(
                                    'mt-1 text-sm font-semibold',
                                    label === 'Yes' && 'text-emerald-400',
                                    label === 'No' && 'text-slate-400',
                                    label === '—' && 'text-slate-600',
                                  )}
                                >
                                  {label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isMentorView && rawCategories && (
                      <div className="space-y-3">
                        <h5 className="text-base font-semibold text-white flex items-center gap-2">
                          <Database className="w-4 h-4 text-indigo-400" /> Spreadsheet details
                        </h5>

                        {Object.values(rawCategories).every((c) => c.items.length === 0) ? (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center">
                            <p className="text-sm text-slate-500">
                              No spreadsheet fields available for this school.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(rawCategories).map(([catKey, category]) => {
                              if (category.items.length === 0) return null;
                              return (
                                <div
                                  key={catKey}
                                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50"
                                >
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/60 px-4 py-2.5">
                                    <p className="text-xs font-semibold text-slate-300">
                                      {category.label}
                                    </p>
                                    <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">
                                      {category.items.length}
                                    </span>
                                  </div>
                                  <dl className="divide-y divide-slate-800/70">
                                    {category.items.map(([key, value]) => {
                                      const valStr = value?.toString() || '';
                                      const isLink =
                                        /^https?:\/\//i.test(valStr) ||
                                        valStr.startsWith('www.');
                                      const href = isLink
                                        ? valStr.startsWith('www.')
                                          ? `https://${valStr}`
                                          : valStr
                                        : '';
                                      const isEmail =
                                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr);
                                      const ynLabel = formatYesNo(valStr);
                                      const isYn =
                                        !isLink &&
                                        !isEmail &&
                                        (ynLabel === 'Yes' || ynLabel === 'No') &&
                                        /^(y|n|yes|no)$/i.test(valStr.trim());
                                      const display = isYn ? ynLabel : valStr;
                                      const isLong = display.length > 80 || display.includes('\n');

                                      return (
                                        <div
                                          key={`${catKey}-${key}`}
                                          className={`grid gap-1 px-4 py-3 sm:grid-cols-[minmax(140px,34%)_1fr] sm:gap-4 ${
                                            isLong ? 'sm:items-start' : 'sm:items-center'
                                          }`}
                                        >
                                          <dt className="text-xs font-medium text-slate-500 leading-snug">
                                            {key}
                                          </dt>
                                          <dd className="min-w-0 text-sm text-slate-200 leading-relaxed">
                                            {isLink ? (
                                              <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-start gap-1.5 text-indigo-400 hover:text-indigo-300 break-all"
                                              >
                                                <span className="line-clamp-2">{valStr}</span>
                                                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                              </a>
                                            ) : isEmail ? (
                                              <a
                                                href={`mailto:${valStr}`}
                                                className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 break-all"
                                              >
                                                {valStr}
                                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                              </a>
                                            ) : isYn ? (
                                              <span
                                                className={
                                                  ynLabel === 'Yes'
                                                    ? 'font-semibold text-emerald-400'
                                                    : 'font-semibold text-slate-400'
                                                }
                                              >
                                                {ynLabel}
                                              </span>
                                            ) : (
                                              <span className={isLong ? 'whitespace-pre-wrap' : ''}>
                                                {display}
                                              </span>
                                            )}
                                          </dd>
                                        </div>
                                      );
                                    })}
                                  </dl>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-4">
                    {isMentorView && (
                      <div className="bg-indigo-600 rounded-xl p-5 text-white relative overflow-hidden">
                        <h5 className="text-base font-semibold mb-4 relative z-10">Tuition & Costs</h5>
                        <div className="space-y-4 relative z-10">
                          <div>
                            <p className="text-[10px] font-medium text-indigo-200 uppercase tracking-widest mb-1">Resident Tuition</p>
                            <p className="text-2xl font-semibold">${selectedSchool.tuitionRes.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-indigo-200 uppercase tracking-widest mb-1">Non-Resident Tuition</p>
                            <p className="text-2xl font-semibold">${selectedSchool.tuitionNonRes.toLocaleString()}</p>
                          </div>
                          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                            <span className="text-sm font-medium text-indigo-100">Campus Housing</span>
                            <span className="font-semibold">{selectedSchool.housing ? 'Available' : 'Not Available'}</span>
                          </div>
                        </div>
                        <DollarSign className="absolute -bottom-8 -right-8 w-36 h-36 text-white/10" />
                      </div>
                    )}

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                      <h5 className="text-sm font-semibold text-white uppercase tracking-widest">Additional Info</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm gap-3">
                          <span className="text-slate-500">Accepts Canadians</span>
                          <span className={`font-semibold shrink-0 ${selectedSchool.canadians ? 'text-emerald-400' : 'text-slate-400'}`}>{selectedSchool.canadians ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-start justify-between text-sm gap-3">
                          <span className="text-slate-500 leading-snug">Accepts Non-U.S. &amp; Non-Canadian Applicants</span>
                          <span className={`font-semibold shrink-0 ${selectedSchool.acceptsNonUsNonCanadian ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {selectedSchool.acceptsNonUsNonCanadian ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm gap-3">
                          <span className="text-slate-500">Class Size</span>
                          <span className="text-white font-semibold shrink-0">{selectedSchool.classSize || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm gap-3">
                          <span className="text-slate-500">Applicants</span>
                          <span className="text-white font-semibold shrink-0">{selectedSchool.applicants ? selectedSchool.applicants.toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm gap-3">
                          <span className="text-slate-500">Acceptance rate</span>
                          <span className="text-emerald-400 font-semibold shrink-0">
                            {selectedSchool.acceptanceRate ? `${selectedSchool.acceptanceRate}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      {selectedSchool.additionalInfo && (
                        <div className="pt-4 border-t border-slate-800">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Notes</p>
                          <p className="text-xs text-slate-400 leading-relaxed italic">&ldquo;{selectedSchool.additionalInfo}&rdquo;</p>
                        </div>
                      )}

                      {(selectedSchool.links || selectedSchool.website) && (
                        <div className="pt-4 space-y-2">
                          {selectedSchool.links && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-indigo-400"
                              leftIcon={<ExternalLink className="w-3 h-3" />}
                              onClick={() => window.open(selectedSchool.links, '_blank', 'noopener,noreferrer')}
                            >
                              Video Tour
                            </Button>
                          )}
                          {selectedSchool.website && selectedSchool.website !== selectedSchool.links && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-indigo-400"
                              leftIcon={<Globe className="w-3 h-3" />}
                              onClick={() => window.open(selectedSchool.website, '_blank', 'noopener,noreferrer')}
                            >
                              Official Website
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0 flex items-center justify-between gap-3">
                <Button
                  variant={favorites.includes(selectedSchool.id) ? 'outline' : 'secondary'}
                  size="sm"
                  leftIcon={<Heart className={`w-4 h-4 ${favorites.includes(selectedSchool.id) ? 'fill-current' : ''}`} />}
                  onClick={() => toggleFavorite(selectedSchool.id)}
                  className={favorites.includes(selectedSchool.id) ? 'text-rose-500 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15' : ''}
                >
                  {favorites.includes(selectedSchool.id) ? 'Favorited' : 'Add to Favorites'}
                </Button>
                <div className="flex items-center gap-2">
                  {onSelectSchool && (
                    <Button
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      disabled={isAlreadyAdded(selectedSchool)}
                      title={
                        isAlreadyAdded(selectedSchool)
                          ? 'Already on your school list'
                          : 'Add to this category'
                      }
                      onClick={() => {
                        if (isAlreadyAdded(selectedSchool)) return;
                        onSelectSchool(selectedSchool);
                        setSelectedSchool(null);
                      }}
                    >
                      {isAlreadyAdded(selectedSchool) ? 'Already added' : 'Select'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedSchool(null)}
                  >
                    Close Details
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchoolFilterView;
