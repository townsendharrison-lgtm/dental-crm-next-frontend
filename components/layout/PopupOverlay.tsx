"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { useActivePopups, useDismissPopup } from "@/lib/hooks/usePopups";
import type { PopupAdvertisement } from "@/lib/types";

function fieldImage(p: PopupAdvertisement) {
  return p.imageUrl ?? p.image_url ?? "";
}
function fieldBg(p: PopupAdvertisement) {
  return p.backgroundColor ?? p.background_color ?? "#1e1b4b";
}
function fieldFg(p: PopupAdvertisement) {
  return p.textColor ?? p.text_color ?? "#ffffff";
}
function fieldCta(p: PopupAdvertisement) {
  return p.ctaText ?? p.cta_text ?? "";
}
function fieldCtaUrl(p: PopupAdvertisement) {
  return p.ctaUrl ?? p.cta_url ?? "";
}
function fieldTarget(p: PopupAdvertisement) {
  return String(p.targetRole ?? p.target_role ?? "BOTH").toUpperCase();
}

export function PopupOverlay() {
  const { user } = useAuth();
  const { role } = useRole();
  const { data: activePopups = [] } = useActivePopups(!!user);
  const dismissMutation = useDismissPopup();
  const [activePopup, setActivePopup] = useState<PopupAdvertisement | null>(null);

  const eligiblePopups = useMemo(() => {
    if (!role) return [];
    const roleUpper = String(role).toUpperCase();
    return activePopups.filter((p) => {
      const target = fieldTarget(p);
      return target === "BOTH" || target === roleUpper;
    });
  }, [activePopups, role]);

  useEffect(() => {
    if (!user || !role) {
      setActivePopup(null);
      return;
    }

    const eligible = eligiblePopups[0] ?? null;
    if (!eligible) {
      setActivePopup(null);
      return;
    }

    const timer = setTimeout(() => {
      setActivePopup(eligible);
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, role, eligiblePopups]);

  const handleDismiss = () => {
    if (!activePopup) return;
    const id = activePopup.id;
    setActivePopup(null);
    dismissMutation.mutate(id);
  };

  if (!activePopup) return null;

  const bg = fieldBg(activePopup);
  const fg = fieldFg(activePopup);
  const img = fieldImage(activePopup);
  const cta = fieldCta(activePopup);
  const ctaUrl = fieldCtaUrl(activePopup);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: bg,
            color: fg,
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors z-10 cursor-pointer"
            style={{ color: fg }}
          >
            <X className="w-6 h-6" />
          </button>

          {img && (
            <div className="h-64 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-12 text-center space-y-6">
            <h3 className="text-3xl font-bold tracking-tight">{activePopup.title}</h3>
            <p className="text-lg opacity-90 leading-relaxed">{activePopup.message}</p>

            {cta && ctaUrl && (
              <div className="pt-4">
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl cursor-pointer"
                  style={{
                    backgroundColor: fg,
                    color: bg,
                  }}
                >
                  {cta}
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
