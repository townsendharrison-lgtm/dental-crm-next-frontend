"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Phone,
  Star,
  Users,
  Filter,
  ChevronDown,
  ArrowLeft,
  Map as MapIcon,
  List,
  Plus,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Info,
  LocateFixed,
  MapPinOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Dentist } from "@/lib/types";

// Dynamically import Leaflet Map to prevent Next.js SSR document is not defined errors
const DentistMap = dynamic(() => import("./DentistMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-950/40 flex items-center justify-center flex-col gap-3">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mounting Map Engine...</span>
    </div>
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const DENTAL_SPECIALTIES = [
  { code: "1223G0001X", name: "General Dentistry" },
  { code: "1223P0221X", name: "Pediatric Dentistry" },
  { code: "1223X0400X", name: "Orthodontics" },
  { code: "1223S0112X", name: "Oral Surgery" },
  { code: "1223E0200X", name: "Endodontics" },
  { code: "1223P0300X", name: "Periodontics" },
  { code: "1223P0700X", name: "Prosthodontics" },
  { code: "1223D0001X", name: "Public Health" },
  { code: "1223P0106X", name: "Oral Pathology" },
];

const STATE_OPTIONS = [
  { label: "ST", value: "" },
  { label: "AL", value: "AL" }, { label: "AK", value: "AK" }, { label: "AZ", value: "AZ" }, { label: "AR", value: "AR" },
  { label: "CA", value: "CA" }, { label: "CO", value: "CO" }, { label: "CT", value: "CT" }, { label: "DC", value: "DC" },
  { label: "DE", value: "DE" }, { label: "FL", value: "FL" }, { label: "GA", value: "GA" }, { label: "HI", value: "HI" },
  { label: "IA", value: "IA" }, { label: "ID", value: "ID" }, { label: "IL", value: "IL" }, { label: "IN", value: "IN" },
  { label: "KS", value: "KS" }, { label: "KY", value: "KY" }, { label: "LA", value: "LA" }, { label: "MA", value: "MA" },
  { label: "MD", value: "MD" }, { label: "ME", value: "ME" }, { label: "MI", value: "MI" }, { label: "MN", value: "MN" },
  { label: "MO", value: "MO" }, { label: "MS", value: "MS" }, { label: "MT", value: "MT" }, { label: "NC", value: "NC" },
  { label: "ND", value: "ND" }, { label: "NE", value: "NE" }, { label: "NH", value: "NH" }, { label: "NJ", value: "NJ" },
  { label: "NM", value: "NM" }, { label: "NV", value: "NV" }, { label: "NY", value: "NY" }, { label: "OH", value: "OH" },
  { label: "OK", value: "OK" }, { label: "OR", value: "OR" }, { label: "PA", value: "PA" }, { label: "RI", value: "RI" },
  { label: "SC", value: "SC" }, { label: "SD", value: "SD" }, { label: "TN", value: "TN" }, { label: "TX", value: "TX" },
  { label: "UT", value: "UT" }, { label: "VA", value: "VA" }, { label: "VT", value: "VT" }, { label: "WA", value: "WA" },
  { label: "WI", value: "WI" }, { label: "WV", value: "WV" }, { label: "WY", value: "WY" }
];

const SPECIALTY_OPTIONS = [
  { label: "All Specialties", value: "" },
  ...DENTAL_SPECIALTIES.map(s => ({ label: s.name, value: s.code }))
];

const SORT_OPTIONS = [
  { label: "Nearest", value: "nearest" },
  { label: "Highest Rating", value: "rating" },
  { label: "Most Shadow-Friendly", value: "friendly" },
  { label: "Alphabetical", value: "alpha" }
];

const SkeletalLoader = () => (
  <div className="grid grid-cols-1 gap-6">
    {[1, 2, 3].map((n) => (
      <div key={n} className="bg-slate-900/30 border border-slate-800/80 p-8 rounded-3xl animate-pulse">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-indigo-500/10 rounded-full w-24"></div>
            <div className="h-6 bg-slate-800 rounded-full w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-800 rounded-full w-1/2"></div>
              <div className="h-3 bg-slate-800 rounded-full w-1/4"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              <div className="h-16 bg-slate-950/30 rounded-2xl border border-slate-800/50"></div>
              <div className="h-16 bg-slate-950/30 rounded-2xl border border-slate-800/50"></div>
              <div className="h-16 bg-slate-950/30 rounded-2xl border border-slate-800/50"></div>
            </div>
          </div>
          <div className="lg:w-64 flex flex-col justify-center gap-3">
            <div className="h-12 bg-slate-950/50 border border-slate-800/80 rounded-2xl"></div>
            <div className="h-12 bg-slate-950/50 border border-slate-800/80 rounded-2xl"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const MapLoader = () => (
  <div className="absolute inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs font-bold text-slate-300 tracking-wider uppercase">Loading dentists on map...</p>
  </div>
);

const CustomDropdown = ({ options, value, onChange, placeholder, className, listClassName = "", align = "left" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-full focus:outline-none gap-2 font-bold tracking-wider"
      >
        <span className={!selectedOption && placeholder ? "text-slate-500" : "text-slate-300"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 w-max min-w-[120px] bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden ${align === "right" ? "right-0" : "left-0"} ${listClassName}`}
          >
            <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
              {options.map((option: any) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${value === option.value ? "bg-indigo-600/20 text-indigo-400 font-bold" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FindDentistViewProps {
  onBack?: () => void;
  onBackText?: string;
  hideHeaderOnDesktop?: boolean;
}

export default function FindDentistView({ onBack, onBackText, hideHeaderOnDesktop = false }: FindDentistViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [sortBy, setSortBy] = useState<"nearest" | "rating" | "friendly" | "alpha">("nearest");

  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied" | "unavailable">("pending");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const [reportingDentist, setReportingDentist] = useState<Dentist | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const requestLocationPermission = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus("granted");
      },
      (err) => {
        console.warn("Geolocation denied", err);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const handleToggleLocation = useCallback(() => {
    const next = !locationEnabled;
    setLocationEnabled(next);
    if (next) {
      requestLocationPermission();
    } else {
      setUserLocation(null);
    }
  }, [locationEnabled, requestLocationPermission]);

  useEffect(() => {
    if (locationEnabled) {
      requestLocationPermission();
    }
  }, [locationEnabled, requestLocationPermission]);

  useEffect(() => {
    if (locationEnabled && userLocation && dentists.length > 0) {
      const needsUserDistanceUpdate = dentists.some(
        (d) => (d as any).distanceFromUser === undefined && d.latitude && d.longitude
      );
      if (needsUserDistanceUpdate) {
        setDentists((prev) =>
          prev.map((d) => {
            if (d.latitude && d.longitude) {
              const gpsDist = calculateDistance(userLocation.lat, userLocation.lng, d.latitude, d.longitude);
              return {
                ...d,
                distance: gpsDist,
                distanceFromUser: gpsDist,
              };
            }
            return d;
          })
        );
      }
    }
  }, [userLocation, dentists, locationEnabled]);

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    if (!locationEnabled) setLocationEnabled(true);

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const loc = { lat, lng };
        setUserLocation(loc);

        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
          );
          if (r.ok) {
            const data = await r.json();
            const addr = data.address || {};
            const zip = addr.postcode || "";
            const cityName = addr.city || addr.town || addr.village || "";
            const stateName = addr.state ? addr.state.toUpperCase() : "";

            if (zip) setZipCode(zip.slice(0, 5));
            if (cityName) setCity(cityName);

            if (stateName) {
              const matched = STATE_OPTIONS.find(
                (o) =>
                  o.label === stateName ||
                  o.value === stateName ||
                  (stateName.length > 2 && o.label === stateName.slice(0, 2))
              );
              if (matched) {
                setState(matched.value);
              }
            }
          }
        } catch (err) {
          console.warn("Reverse geocoding failed", err);
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError("Failed to retrieve your location. Please check browser permissions.");
        setIsLoading(false);
      }
    );
  };

  const handleSearch = async (e?: React.FormEvent, targetPage?: number) => {
    if (e) {
      e.preventDefault();
      setCurrentPage(1);
      targetPage = 1;
    }

    const pageToFetch = targetPage !== undefined ? targetPage : currentPage;
    setIsLoading(true);
    setError(null);

    const cleanZip = zipCode.replace(/\D+/g, "");
    if (cleanZip && cleanZip.length !== 5) {
      setError("ZIP must be 5 digits if provided.");
      setIsLoading(false);
      setDentists([]);
      return;
    }
    if (!cleanZip && !state && !city && !searchQuery) {
      setError("Add at least one filter: ZIP, State, City, or Name.");
      setIsLoading(false);
      setDentists([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (cleanZip) params.append("zip", cleanZip);
      if (city) params.append("city", city);
      if (state) params.append("state", state);
      if (searchQuery) params.append("name", searchQuery);
      if (specialty) params.append("specialty", specialty);
      params.append("sortBy", sortBy);
      params.append("page", String(pageToFetch));
      params.append("limit", "20");

      if (locationEnabled && userLocation) {
        params.append("userLat", String(userLocation.lat));
        params.append("userLng", String(userLocation.lng));
      }

      const geocodeSearchOrigin = async (): Promise<{ lat: number; lng: number; label: string } | null> => {
        const parts: string[] = [];
        if (city) parts.push(city);
        if (state) parts.push(state);
        if (cleanZip) parts.push(cleanZip);
        if (parts.length === 0) return null;
        const q = parts.join(", ");
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=us`
          );
          if (!r.ok) return null;
          const arr: any[] = await r.json();
          if (!arr || arr.length === 0) return null;
          return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon), label: q };
        } catch {
          return null;
        }
      };

      const [response, originResult] = await Promise.all([
        fetch(`${API_URL}/api/dentists?${params.toString()}`),
        geocodeSearchOrigin(),
      ]);
      if (!response.ok) throw new Error("Failed to fetch dentists");

      const data = await response.json();
      setSearchOrigin(originResult);
      setDentists(data.results || []);
      setTotalResults(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setHasSearched(true);
      setMapKey((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedDentists = dentists;

  useEffect(() => {
    if (hasSearched) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        handleSearch(undefined, 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, specialty]);

  useEffect(() => {
    if (hasSearched) {
      handleSearch(undefined, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingDentist) return;

    setReportError(null);
    setReportSubmitting(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      npi: reportingDentist.npi,
      allowed: formData.get("allowed") === "yes",
      rating: Number(formData.get("rating")),
    };

    try {
      const res = await fetch(`${API_URL}/api/shadow-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const data = await res.json();
        setReportError(data.error || "You already submitted a report for this dentist recently.");
        setReportSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to submit report");
      }

      setReportSuccess(true);
      setReportSubmitting(false);
      toast.success("Experience report submitted successfully!");

      setTimeout(() => {
        setReportSuccess(false);
        setReportingDentist(null);
        setReportError(null);
        handleSearch(); // Refresh search list
      }, 2000);
    } catch (err: any) {
      setReportError(err.message || "Failed to submit report");
      setReportSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            {onBackText && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft size={14} /> {onBackText}
              </button>
            ) : null}
            <div className={hideHeaderOnDesktop ? "lg:hidden" : ""}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-2">
                FIND A <span className="text-indigo-500">DENTIST</span>
              </h1>
              <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">
                Shadowing Opportunity Discovery Engine
              </p>
            </div>
          </div>

          <div className="flex w-full md:w-auto bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              <List size={16} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                viewMode === "map" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              <MapIcon size={16} /> Map
            </button>
          </div>
        </header>

        {/* Non-blocking location status banner */}
        {locationEnabled && locationStatus === "denied" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                <MapPinOff size={14} className="text-amber-400" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Location access was denied — distance info won't appear.{" "}
                <span className="text-amber-400/80 font-semibold">Safari users:</span> go to Settings → Safari →
                Location Services, or check your address bar for the location prompt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocationEnabled(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest whitespace-nowrap transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-2xl mb-6 lg:mb-8 flex flex-col lg:flex-row shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row flex-1 w-full">
            <div className="flex-1 flex items-center px-4 border-b lg:border-b-0 lg:border-r border-slate-800/50">
              <Search className="text-indigo-500/70 mr-3 shrink-0" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Dentist Name..."
                className="w-full bg-transparent border-none focus:outline-none text-white py-4 placeholder:text-slate-600 font-medium"
              />
            </div>

            <div className="flex-1 flex items-center px-4 border-b lg:border-b-0 lg:border-r border-slate-800/50 justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <MapPin className="text-indigo-500/70 mr-3 shrink-0" size={20} />
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="ZIP Code"
                  maxLength={5}
                  className="w-full bg-transparent border-none focus:outline-none text-white py-4 placeholder:text-slate-600 font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title="Use Current Location"
                className="p-2 hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Navigation size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">GPS</span>
              </button>
            </div>

            <div className="flex-1 flex items-center px-4 border-b lg:border-b-0 lg:border-r border-slate-800/50">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full bg-transparent border-none focus:outline-none text-white py-4 placeholder:text-slate-600 font-medium"
              />
              <CustomDropdown
                options={STATE_OPTIONS}
                value={state}
                onChange={setState}
                placeholder="ST"
                className="py-4 cursor-pointer shrink-0"
                listClassName="min-w-[80px]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 lg:px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 lg:ml-2 mt-2 lg:mt-0 whitespace-nowrap cursor-pointer"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-8 lg:mb-12 px-1 sm:px-2">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-3 sm:px-4 py-2">
              <Filter size={14} className="text-slate-500" />
              <CustomDropdown
                options={SPECIALTY_OPTIONS}
                value={specialty}
                onChange={setSpecialty}
                placeholder="All Specialties"
                className="text-xs py-2 pr-2"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-3 sm:px-4 py-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sort by:</span>
              <CustomDropdown
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort By"
                className="text-xs py-2 pr-2"
              />
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/50 border border-slate-800 rounded-xl px-3 sm:px-4 py-2">
              <LocateFixed
                size={14}
                className={locationEnabled && locationStatus === "granted" ? "text-indigo-400" : "text-slate-600"}
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Location
              </span>
              <button
                type="button"
                onClick={handleToggleLocation}
                className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 cursor-pointer ${
                  locationEnabled
                    ? locationStatus === "granted"
                      ? "bg-indigo-600"
                      : "bg-amber-500"
                    : "bg-slate-700"
                }`}
                title={locationEnabled ? "Disable location services" : "Enable location services"}
              >
                <div
                  className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
                    locationEnabled ? "left-[22px]" : "left-[3px]"
                  }`}
                />
              </button>
              {locationEnabled && locationStatus === "pending" && (
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl flex items-center gap-4 text-rose-400 mb-8">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {viewMode === "list" ? (
          isLoading ? (
            <SkeletalLoader />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortedDentists.map((dentist, idx) => (
                <motion.div
                  key={dentist.npi}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="space-y-3">
                          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                            {dentist.specialty}
                          </span>
                          <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {dentist.name}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-500 text-sm">
                            <span className="flex items-start sm:items-center gap-1.5">
                              <MapPin size={14} className="mt-0.5 sm:mt-0 shrink-0" /> {dentist.address}, {dentist.city}
                              , {dentist.state} {dentist.zip}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Phone size={14} className="shrink-0" /> {dentist.phone}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                          {locationEnabled && (dentist as any).distance !== undefined && (
                            <div className="bg-slate-950/50 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2 whitespace-nowrap">
                              <Navigation size={14} className="text-indigo-400" />
                              <span className="text-sm font-black text-white">
                                {(dentist as any).distance.toFixed(1)} mi{userLocation ? " from you" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                        <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                            Shadow Friendly
                          </p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-emerald-400">
                              {dentist.shadowStats?.totalReports ? `${dentist.shadowStats.allowedPercentage}%` : "—"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Allowed</span>
                          </div>
                        </div>
                        <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                            Student Rating
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white">
                              {dentist.shadowStats?.totalReports ? dentist.shadowStats.avgRating : "—"}
                            </span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={12}
                                  className={
                                    s <= Number(dentist.shadowStats?.avgRating || 0)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-700"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50">
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                            Total Reports
                          </p>
                          <div className="flex items-center gap-2">
                            <Users size={18} className="text-indigo-400" />
                            <span className="text-2xl font-black text-white">
                              {dentist.shadowStats?.totalReports || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-64 flex flex-col justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setReportingDentist(dentist)}
                        className="w-full py-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus size={14} /> Report Experience
                      </button>
                      <a
                        href={`tel:${dentist.phone}`}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                      >
                        <Phone size={14} /> Call Office
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}

              {dentists.length === 0 && !isLoading && !error && (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search size={32} className="text-slate-700" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Dentists Found</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Try adjusting your search filters or searching by zip code.
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="h-[500px] sm:h-[600px] bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden relative">
            {isLoading && <MapLoader />}
            <DentistMap
              key={mapKey}
              sortedDentists={sortedDentists}
              searchOrigin={searchOrigin}
              userLocation={userLocation}
              locationEnabled={locationEnabled}
              onReportDentist={setReportingDentist}
            />

            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 bg-slate-950/90 backdrop-blur border border-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl max-w-[calc(100%-2rem)] sm:max-w-xs">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <Info size={14} className="text-indigo-400 shrink-0" />
                <p>
                  Showing {sortedDentists.filter((d) => d.latitude && d.longitude).length} of {sortedDentists.length}{" "}
                  dentists on map.{searchOrigin ? " Distances from your searched area." : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {hasSearched && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 lg:mt-12 bg-slate-900/30 border border-slate-800/80 p-4 sm:p-6 rounded-3xl backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Showing <span className="text-white">{(currentPage - 1) * 20 + 1}</span> -{" "}
              <span className="text-white">{Math.min(currentPage * 20, totalResults)}</span> of{" "}
              <span className="text-white">{totalResults}</span> dentists
            </span>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                disabled={currentPage === 1 || isLoading}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800/80 text-xs font-bold text-slate-400 hover:text-white rounded-xl disabled:opacity-30 disabled:hover:text-slate-400 transition-all flex items-center gap-1 cursor-pointer"
              >
                &larr; Prev
              </button>

              {(() => {
                const pages = [];
                const maxVisible = 5;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                if (endPage - startPage + 1 < maxVisible) {
                  startPage = Math.max(1, endPage - maxVisible + 1);
                }

                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === 1
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950/50 border border-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      1
                    </button>
                  );
                  if (startPage > 2) {
                    pages.push(
                      <span key="dots-start" className="text-slate-600 px-1 text-xs">
                        ...
                      </span>
                    );
                  }
                }

                for (let p = startPage; p <= endPage; p++) {
                  pages.push(
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950/50 border border-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="dots-end" className="text-slate-600 px-1 text-xs">
                        ...
                      </span>
                    );
                  }
                  pages.push(
                    <button
                      key={totalPages}
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === totalPages
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950/50 border border-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}

              <button
                type="button"
                disabled={currentPage === totalPages || isLoading}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-4 py-2.5 bg-slate-950 border border-slate-800/80 text-xs font-bold text-slate-400 hover:text-white rounded-xl disabled:opacity-30 disabled:hover:text-slate-400 transition-all flex items-center gap-1 cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportingDentist && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div>
                  <h3 className="text-xl font-bold text-white">Shadowing Report</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                    {reportingDentist.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportingDentist(null)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <XIcon size={24} className="rotate-45" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-2">Report Submitted</h4>
                  <p className="text-slate-500">Thank you for helping the community!</p>
                </div>
              ) : (
                <form className="p-8 space-y-6" onSubmit={handleReportSubmit}>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                      Were you allowed to shadow?
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="relative cursor-pointer group">
                        <input type="radio" name="allowed" value="yes" defaultChecked required className="peer sr-only" />
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center font-bold text-slate-500 peer-checked:bg-emerald-500/10 peer-checked:border-emerald-500 peer-checked:text-emerald-400 transition-all">
                          Yes
                        </div>
                      </label>
                      <label className="relative cursor-pointer group">
                        <input type="radio" name="allowed" value="no" className="peer sr-only" />
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center font-bold text-slate-500 peer-checked:bg-rose-500/10 peer-checked:border-rose-500 peer-checked:text-rose-400 transition-all">
                          No
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                      Shadowing Rating (1-5)
                    </label>
                    <div className="flex justify-between gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <label key={val} className="flex-1 cursor-pointer">
                          <input type="radio" name="rating" value={val} defaultChecked={val === 5} className="peer sr-only" />
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center font-bold text-slate-500 peer-checked:bg-indigo-600 peer-checked:text-white transition-all">
                            {val}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {reportError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400">
                      <AlertCircle size={16} />
                      <p className="text-sm font-bold">{reportError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {reportSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const XIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14M12 5v14" />
  </svg>
);
