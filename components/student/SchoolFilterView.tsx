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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDentalSchoolsCatalog } from '@/lib/hooks/useDentalSchoolsCatalog';
import { COL_MAP } from '@/lib/schools/sheetCatalog';
import {
  Button,
  Input,
  SelectMenu,
  Badge,
  EmptyState,
  Card,
  Spinner,
} from '@/components/ui';

export type { DentalSchool } from '@/lib/schools/sheetCatalog';
import type { DentalSchool } from '@/lib/schools/sheetCatalog';

interface SchoolFilterViewProps {
  onSelectSchool?: (school: DentalSchool) => void;
  isModal?: boolean;
  isMentorView?: boolean;
}

const SchoolFilterView: React.FC<SchoolFilterViewProps> = ({ onSelectSchool, isModal = false, isMentorView = false }) => {
  const { schools, loading, error, refetch } = useDentalSchoolsCatalog();
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('dsg_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
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
    hasHousing: 'All',
    minShadowing: 0
  });
  const [sortBy, setSortBy] = useState('alphabetical');
  const [selectedSchool, setSelectedSchool] = useState<DentalSchool | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'spreadsheet'>('cards');

  useEffect(() => {
    localStorage.setItem('dsg_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to load school data');
    }
  }, [error]);

  // Derived Data
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                           s.location.toLowerCase().includes(search.toLowerCase());
      const matchesState = filters.state === 'All' || s.location.includes(filters.state);
      const matchesType = filters.type === 'All' || s.type.toLowerCase().includes(filters.type.toLowerCase());
      const matchesCGPA = s.cgpa >= filters.minCGPA;
      const matchesSGPA = s.sgpa >= filters.minSGPA;
      const matchesDAT = s.datAA >= filters.minDAT;
      const matchesTuition = s.tuitionRes <= filters.maxTuition;
      const matchesAcceptance = s.acceptanceRate >= filters.minAcceptance;
      const matchesISAcceptance = s.isAcceptanceRate >= filters.minISAcceptance;
      const matchesOOSAcceptance = s.oosAcceptanceRate >= filters.minOOSAcceptance;
      const matchesClassSize = s.classSize >= filters.minClassSize;
      const matchesCanadians = filters.acceptsCanadians === 'All' || 
                               (filters.acceptsCanadians === 'Yes' ? s.canadians : !s.canadians);
      const matchesCC = filters.acceptsCC === 'All' || 
                        (filters.acceptsCC === 'Yes' ? s.ccCredits : !s.ccCredits);
      const matchesHousing = filters.hasHousing === 'All' || 
                             (filters.hasHousing === 'Yes' ? s.housing : !s.housing);
      const matchesShadowing = s.shadowing >= filters.minShadowing;

      return matchesSearch && matchesState && matchesType && matchesCGPA && 
             matchesSGPA && matchesDAT && matchesTuition && matchesAcceptance && 
             matchesISAcceptance && matchesOOSAcceptance &&
             matchesClassSize && matchesCanadians && matchesCC && matchesHousing && matchesShadowing;
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
  }, [schools, search, filters, sortBy]);

  // Categorize raw data for the detail view
  const rawCategories = useMemo(() => {
    if (!selectedSchool) return null;
    
    // Flatten all keywords from COL_MAP to identify handled fields
    const handledHeaders = Object.values(COL_MAP).flat().map(h => h.toLowerCase().trim());
    
    const categories: Record<string, { label: string, items: [string, string][] }> = {
      academic: { label: 'Academic & Stats', items: [] },
      admissions: { label: 'Admissions & Enrollment', items: [] },
      financial: { label: 'Financials & Fees', items: [] },
      demographics: { label: 'Student Demographics', items: [] },
      podcast: { label: 'Podcast & Media', items: [] },
      contact: { label: 'Contact & Resources', items: [] },
      other: { label: 'Other Information', items: [] }
    };

    Object.entries(selectedSchool.raw).forEach(([key, value]) => {
      // Skip empty or N/A values
      if (!value || value === 'N/A' || value === '0') return;
      
      const lowerKey = key.toLowerCase().trim();
      
      // Check if this specific header is already handled in the main UI
      const isHandled = handledHeaders.includes(lowerKey);
      if (isHandled) return;

      // Categorize based on keywords in the header
      const normalizedKey = lowerKey.replace(/[^a-z0-9]/g, '');
      
      if (normalizedKey.includes('podcast') || normalizedKey.includes('dean') || normalizedKey.includes('interview') && normalizedKey.includes('link')) {
        categories.podcast.items.push([key, value]);
      } else if (normalizedKey.includes('gpa') || normalizedKey.includes('dat') || normalizedKey.includes('prereq') || normalizedKey.includes('shadow') || normalizedKey.includes('test') || normalizedKey.includes('score')) {
        categories.academic.items.push([key, value]);
      } else if (normalizedKey.includes('applicant') || normalizedKey.includes('acceptance') || normalizedKey.includes('enrolled') || normalizedKey.includes('size') || normalizedKey.includes('class') || normalizedKey.includes('admission')) {
        categories.admissions.items.push([key, value]);
      } else if (normalizedKey.includes('tuition') || normalizedKey.includes('fee') || normalizedKey.includes('deposit') || normalizedKey.includes('cost') || normalizedKey.includes('price') || normalizedKey.includes('money') || normalizedKey.includes('dollar')) {
        categories.financial.items.push([key, value]);
      } else if (normalizedKey.includes('male') || normalizedKey.includes('female') || normalizedKey.includes('white') || normalizedKey.includes('black') || normalizedKey.includes('hispanic') || normalizedKey.includes('asian') || normalizedKey.includes('international') || normalizedKey.includes('ethnicity') || normalizedKey.includes('race') || normalizedKey.includes('gender')) {
        categories.demographics.items.push([key, value]);
      } else if (normalizedKey.includes('email') || normalizedKey.includes('phone') || normalizedKey.includes('website') || normalizedKey.includes('link') || normalizedKey.includes('contact') || normalizedKey.includes('url') || normalizedKey.includes('address')) {
        categories.contact.items.push([key, value]);
      } else {
        categories.other.items.push([key, value]);
      }
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

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

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
      hasHousing: 'All',
      minShadowing: 0
    });
    setSearch('');
    setSortBy('alphabetical');
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
        <Card className="border-slate-800 bg-slate-900 p-5 space-y-5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by school name, state, or keywords..."
              className="pl-9 bg-slate-950 border-slate-800"
            />
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {/* Location & Type */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Location</label>
                <SelectMenu
                  value={filters.state}
                  onChange={(v) => setFilters({...filters, state: v})}
                  options={states.map(s => ({ value: s, label: s }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">School Type</label>
                <SelectMenu
                  value={filters.type}
                  onChange={(v) => setFilters({...filters, type: v})}
                  options={[
                    { value: 'All', label: 'All Types' },
                    { value: 'Public', label: 'Public' },
                    { value: 'Private', label: 'Private' },
                  ]}
                />
              </div>
            </div>

            {/* GPA & DAT */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex justify-between">
                  Min cGPA <span>{filters.minCGPA.toFixed(2)}</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="4"
                  step="0.01"
                  value={filters.minCGPA}
                  onChange={(e) => setFilters({...filters, minCGPA: parseFloat(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex justify-between">
                  Min DAT AA <span>{filters.minDAT}</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={filters.minDAT}
                  onChange={(e) => setFilters({...filters, minDAT: parseInt(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Acceptance Rates */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex justify-between">
                  Min Acceptance <span>{filters.minAcceptance}%</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={filters.minAcceptance}
                  onChange={(e) => setFilters({...filters, minAcceptance: parseFloat(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex justify-between">
                  Min IS Acceptance <span>{filters.minISAcceptance}%</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="50"
                  step="0.5"
                  value={filters.minISAcceptance}
                  onChange={(e) => setFilters({...filters, minISAcceptance: parseFloat(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* OOS & Tuition */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex justify-between">
                  Min OOS Acceptance <span>{filters.minOOSAcceptance}%</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={filters.minOOSAcceptance}
                  onChange={(e) => setFilters({...filters, minOOSAcceptance: parseFloat(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest flex justify-between">
                  Max Tuition <span>${(filters.maxTuition / 1000).toFixed(0)}k</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="150000"
                  step="5000"
                  value={filters.maxTuition}
                  onChange={(e) => setFilters({...filters, maxTuition: parseInt(e.target.value)})}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col justify-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Accepts Canadians</span>
                <button 
                  type="button"
                  onClick={() => setFilters({...filters, acceptsCanadians: filters.acceptsCanadians === 'Yes' ? 'All' : 'Yes'})}
                  className={`w-10 h-5 rounded-full transition-all relative ${filters.acceptsCanadians === 'Yes' ? 'bg-indigo-600' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${filters.acceptsCanadians === 'Yes' ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Accepts CC Credits</span>
                <button 
                  type="button"
                  onClick={() => setFilters({...filters, acceptsCC: filters.acceptsCC === 'Yes' ? 'All' : 'Yes'})}
                  className={`w-10 h-5 rounded-full transition-all relative ${filters.acceptsCC === 'Yes' ? 'bg-indigo-600' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${filters.acceptsCC === 'Yes' ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Campus Housing</span>
                <button 
                  type="button"
                  onClick={() => setFilters({...filters, hasHousing: filters.hasHousing === 'Yes' ? 'All' : 'Yes'})}
                  className={`w-10 h-5 rounded-full transition-all relative ${filters.hasHousing === 'Yes' ? 'bg-indigo-600' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${filters.hasHousing === 'Yes' ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Area (Full Width) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
                          {[
                            { label: 'Mean cGPA', value: school.cgpa, color: 'text-white' },
                            ...(isMentorView ? [{ label: 'Min cGPA', value: school.minCgpa5th, color: 'text-indigo-400' }] : []),
                            { label: 'DAT AA', value: school.datAA, color: 'text-white' },
                            ...(isMentorView ? [{ label: 'Min DAT', value: school.minDat5th, color: 'text-indigo-400' }] : []),
                            { label: 'Acceptance', value: school.acceptanceRate ? `${school.acceptanceRate}%` : 'N/A', color: 'text-emerald-400' },
                            { label: 'Class Size', value: school.classSize, color: 'text-white' },
                            ...(!isMentorView
                              ? [
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
                              : []),
                          ].map((stat, idx) => (
                            <div key={idx} className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/50 min-h-[58px] flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1 truncate">{stat.label}</p>
                              <p className={`text-sm font-semibold truncate ${stat.color}`}>{stat.value || 'N/A'}</p>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSchool(school);
                              }}
                            >
                              Select
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
                                  {val}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : isEmail ? (
                                <a 
                                  href={`mailto:${valStr}`}
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
                                >
                                  {val}
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                val
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md">
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
                    <div className={`grid gap-2 sm:gap-3 ${isMentorView ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4'}`}>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Mean<br/>cGPA</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.cgpa || 'N/A'}</p>
                      </div>
                      {isMentorView && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                          <p className="text-[9px] sm:text-[10px] font-medium text-indigo-400/70 uppercase tracking-wider leading-tight mb-2">Min cGPA<br/>(5%)</p>
                          <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.minCgpa5th || 'N/A'}</p>
                        </div>
                      )}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Mean<br/>sGPA</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.sgpa || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">DAT AA</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.datAA || 'N/A'}</p>
                      </div>
                      {isMentorView && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                          <p className="text-[9px] sm:text-[10px] font-medium text-indigo-400/70 uppercase tracking-wider leading-tight mb-2">Min DAT<br/>(5%)</p>
                          <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.minDat5th || 'N/A'}</p>
                        </div>
                      )}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-center flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px]">
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight mb-2">Acceptance</p>
                        <p className="text-lg sm:text-2xl font-semibold text-white">{selectedSchool.acceptanceRate ? `${selectedSchool.acceptanceRate}%` : 'N/A'}</p>
                      </div>
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
                                <span className="text-sm text-slate-400">In-State Enrollment</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.inStateEnrollment ? `${selectedSchool.inStateEnrollment}%` : 'N/A'}</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                                <div 
                                  className="bg-emerald-500 h-full transition-all duration-1000" 
                                  style={{ width: `${(selectedSchool.inStateEnrollment / (selectedSchool.inStateEnrollment + selectedSchool.outOfStateEnrollment || 1)) * 100}%` }} 
                                />
                                <div 
                                  className="bg-amber-500 h-full transition-all duration-1000" 
                                  style={{ width: `${(selectedSchool.outOfStateEnrollment / (selectedSchool.inStateEnrollment + selectedSchool.outOfStateEnrollment || 1)) * 100}%` }} 
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Out-of-State Enrollment</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.outOfStateEnrollment ? `${selectedSchool.outOfStateEnrollment}%` : 'N/A'}</span>
                              </div>
                              
                              <div className="pt-2 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">IS Acceptance Rate</span>
                                  <span className="font-semibold text-emerald-400">{selectedSchool.isAcceptanceRate ? `${selectedSchool.isAcceptanceRate}%` : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">OOS Acceptance Rate</span>
                                  <span className="font-semibold text-amber-400">{selectedSchool.oosAcceptanceRate ? `${selectedSchool.oosAcceptanceRate}%` : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Gender Breakdown */}
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Gender</p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Male</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.maleEnrollment || 'N/A'}</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                                <div 
                                  className="bg-blue-500 h-full transition-all duration-1000" 
                                  style={{ width: `${(selectedSchool.maleEnrollment / (selectedSchool.maleEnrollment + selectedSchool.femaleEnrollment || 1)) * 100}%` }} 
                                />
                                <div 
                                  className="bg-pink-500 h-full transition-all duration-1000" 
                                  style={{ width: `${(selectedSchool.femaleEnrollment / (selectedSchool.maleEnrollment + selectedSchool.femaleEnrollment || 1)) * 100}%` }} 
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Female</span>
                                <span className="text-sm font-semibold text-white">{selectedSchool.femaleEnrollment || 'N/A'}</span>
                              </div>
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

                    {isMentorView && (
                      <div className="space-y-4">
                        <h5 className="text-base font-semibold text-white flex items-center gap-2">
                          <Database className="w-4 h-4 text-indigo-400" /> Full Spreadsheet Data
                        </h5>
                        <div className="space-y-6">
                          {rawCategories && Object.entries(rawCategories).map(([catKey, category]) => {
                            if (category.items.length === 0) return null;
                            return (
                              <div key={catKey} className="space-y-3">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">{category.label}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {category.items.map(([key, value]) => {
                                    const valStr = value?.toString() || '';
                                    const isLink = valStr.startsWith('http://') || valStr.startsWith('https://');
                                    const isEmail = valStr.includes('@') && valStr.includes('.') && !valStr.includes(' ');
                                    
                                    return (
                                      <div key={key} className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/50">
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-1">{key}</p>
                                        {isLink ? (
                                          <a 
                                            href={valStr} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 break-all"
                                          >
                                            {value}
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                          </a>
                                        ) : isEmail ? (
                                          <a 
                                            href={`mailto:${valStr}`}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 break-all"
                                          >
                                            {value}
                                            <Mail className="w-3 h-3 flex-shrink-0" />
                                          </a>
                                        ) : (
                                          <p className="text-xs text-slate-300 leading-relaxed">{value}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Accepts Canadians</span>
                          <span className={`font-semibold ${selectedSchool.canadians ? 'text-emerald-400' : 'text-slate-400'}`}>{selectedSchool.canadians ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Class Size</span>
                          <span className="text-white font-semibold">{selectedSchool.classSize}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Applicants</span>
                          <span className="text-white font-semibold">{selectedSchool.applicants.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {selectedSchool.additionalInfo && (
                        <div className="pt-4 border-t border-slate-800">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Notes</p>
                          <p className="text-xs text-slate-400 leading-relaxed italic">&ldquo;{selectedSchool.additionalInfo}&rdquo;</p>
                        </div>
                      )}

                      {isMentorView && (selectedSchool.links || selectedSchool.website) && (
                        <div className="pt-4 space-y-2">
                          {selectedSchool.links && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-indigo-400"
                              leftIcon={<ExternalLink className="w-3 h-3" />}
                              onClick={() => window.open(selectedSchool.links, '_blank', 'noopener,noreferrer')}
                            >
                              Visit School Website
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
                <Button onClick={() => setSelectedSchool(null)}>
                  Close Details
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchoolFilterView;
