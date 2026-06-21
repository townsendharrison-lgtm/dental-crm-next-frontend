"use client";

import React, { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";

export interface PopupAdvertisement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  targetRole: "STUDENT" | "MENTOR" | "ADMIN" | "MENTOR_MANAGER" | "BOTH";
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// Active popups list. Uses a future end date to ensure it displays currently in 2026.
const POPUPS: PopupAdvertisement[] = [
  {
    id: "popup-1",
    title: "Summer Bootcamp 2026",
    message: "Join our exclusive Summer Bootcamp to supercharge your dental school application! Limited spots available.",
    imageUrl: "https://picsum.photos/seed/bootcamp/800/400",
    ctaText: "Learn More",
    ctaUrl: "https://example.com/bootcamp",
    backgroundColor: "#4f46e5",
    textColor: "#ffffff",
    targetRole: "STUDENT",
    startDate: "2026-03-01T00:00:00Z",
    endDate: "2028-06-01T00:00:00Z",
    isActive: true,
  },
];

export function PopupOverlay() {
  const { user } = useAuth();
  const { role } = useRole();
  const [activePopup, setActivePopup] = useState<PopupAdvertisement | null>(null);

  useEffect(() => {
    if (!user || !role) return;

    const now = new Date();
    const dismissedKey = `dismissed_popups_${user.id}`;
    const dismissedIds: string[] = JSON.parse(localStorage.getItem(dismissedKey) || "[]");

    const eligiblePopup = POPUPS.find((p) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      const isScheduled = now >= start && now <= end;
      const isTargeted = p.targetRole === "BOTH" || p.targetRole === role;
      const isNotDismissed = !dismissedIds.includes(p.id);

      return p.isActive && isScheduled && isTargeted && isNotDismissed;
    });

    if (eligiblePopup) {
      // Show popup after a short page-load delay
      const timer = setTimeout(() => {
        setActivePopup(eligiblePopup);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setActivePopup(null);
    }
  }, [user, role]);

  const handleDismiss = () => {
    if (activePopup && user) {
      const dismissedKey = `dismissed_popups_${user.id}`;
      const dismissedIds: string[] = JSON.parse(localStorage.getItem(dismissedKey) || "[]");
      if (!dismissedIds.includes(activePopup.id)) {
        dismissedIds.push(activePopup.id);
        localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds));
      }
      setActivePopup(null);
    }
  };

  if (!activePopup) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: activePopup.backgroundColor || "#1e1b4b",
            color: activePopup.textColor || "#ffffff",
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors z-10 cursor-pointer"
            style={{ color: activePopup.textColor }}
          >
            <X className="w-6 h-6" />
          </button>

          {activePopup.imageUrl && (
            <div className="h-64 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePopup.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-12 text-center space-y-6">
            <h3 className="text-3xl font-bold tracking-tight">{activePopup.title}</h3>
            <p className="text-lg opacity-90 leading-relaxed">{activePopup.message}</p>

            {activePopup.ctaText && activePopup.ctaUrl && (
              <div className="pt-4">
                <a
                  href={activePopup.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl cursor-pointer"
                  style={{
                    backgroundColor: activePopup.textColor || "#ffffff",
                    color: activePopup.backgroundColor || "#4f46e5",
                  }}
                >
                  {activePopup.ctaText}
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="block w-full text-sm font-bold opacity-50 hover:opacity-100 transition-opacity mt-4 cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
