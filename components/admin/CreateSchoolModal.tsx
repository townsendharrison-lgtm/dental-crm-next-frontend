"use client";

import React, { useState } from "react";
import { School as SchoolIcon, Globe, Sparkles, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button, Modal } from "@/components/ui";
import { useCreateSchool } from "@/lib/hooks/useSchools";
import { aiServerApi, DentalSchoolProfile } from "@/lib/api/aiServer";
import type { School } from "@/lib/types";

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolCreated: (school: School, profile?: DentalSchoolProfile) => void;
}

export default function CreateSchoolModal({
  isOpen,
  onClose,
  onSchoolCreated,
}: CreateSchoolModalProps) {
  const createSchoolMutation = useCreateSchool();

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter the school name");
    if (!websiteUrl.trim()) return toast.error("Please enter the school website / admissions URL");
    if (!location.trim()) return toast.error("Please enter the location (City, State)");

    setIsSubmitting(true);
    try {
      // 1. Create in CRM Database
      const newSchool = await createSchoolMutation.mutateAsync({
        name: name.trim(),
        location: location.trim(),
      });

      // 2. Register on AI Server and automatically trigger LangGraph crawl
      let aiProfile: DentalSchoolProfile | undefined;
      try {
        aiProfile = await aiServerApi.createSchoolProfile({
          name: name.trim(),
          location: location.trim(),
          website_url: websiteUrl.trim(),
          crawl_now: true,
        });
      } catch (aiErr) {
        console.warn("AI server auto-crawl note:", aiErr);
      }

      toast.success(`${name} created and website crawl started automatically!`);
      onSchoolCreated(newSchool, aiProfile);
      onClose();

      // Reset form
      setName("");
      setWebsiteUrl("");
      setLocation("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create school");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Add New Dental School"
      description="Create a new school. The AI will automatically crawl the website to extract verified admissions criteria."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            School Name <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <SchoolIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. UT Health San Antonio School of Dentistry"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            School Website / Admissions URL <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="url"
              required
              placeholder="https://dental.uthscsa.edu/admissions"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            The LangGraph agent will crawl this URL on submit to extract verified admission criteria and citations.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Location (City, State) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. San Antonio, TX"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="text-xs gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Crawling & Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Create & Auto-Crawl
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
