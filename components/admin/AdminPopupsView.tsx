"use client";

import React, { useState } from "react";
import type { PopupAdvertisement } from "@/lib/types";
import {
  Plus,
  Calendar,
  Users,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  Link as LinkIcon,
  Palette,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { DatePicker } from "@/components/ui/DatePicker";
import { SelectMenu } from "@/components/ui/SelectMenu";

interface AdminPopupsViewProps {
  popups: PopupAdvertisement[];
  onAddPopup: (popup: Partial<PopupAdvertisement>) => void;
  onUpdatePopup: (popup: PopupAdvertisement) => void;
  onDeletePopup: (popupId: string) => void;
  hideHeader?: boolean;
}

type PopupFormState = {
  title: string;
  message: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  backgroundColor: string;
  textColor: string;
  targetRole: "STUDENT" | "MENTOR" | "BOTH";
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function toDateOnly(iso: string | undefined | null) {
  if (!iso) return "";
  return iso.includes("T") ? iso.split("T")[0] : iso.slice(0, 10);
}

function toStartIso(dateOnly: string) {
  return `${dateOnly}T00:00:00.000Z`;
}

function toEndIso(dateOnly: string) {
  return `${dateOnly}T23:59:59.999Z`;
}

function defaultForm(): PopupFormState {
  const today = new Date().toISOString().split("T")[0];
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return {
    title: "",
    message: "",
    imageUrl: "",
    ctaText: "",
    ctaUrl: "",
    backgroundColor: "#4f46e5",
    textColor: "#ffffff",
    targetRole: "STUDENT",
    startDate: today,
    endDate: weekLater,
    isActive: true,
  };
}

function popupImage(p: PopupAdvertisement) {
  return p.imageUrl ?? p.image_url ?? "";
}
function popupBg(p: PopupAdvertisement) {
  return p.backgroundColor ?? p.background_color ?? "#4f46e5";
}
function popupFg(p: PopupAdvertisement) {
  return p.textColor ?? p.text_color ?? "#ffffff";
}
function popupStart(p: PopupAdvertisement) {
  return p.startDate ?? p.start_date ?? "";
}
function popupEnd(p: PopupAdvertisement) {
  return p.endDate ?? p.end_date ?? "";
}
function popupTarget(p: PopupAdvertisement) {
  return p.targetRole ?? p.target_role ?? "BOTH";
}
function popupActive(p: PopupAdvertisement) {
  if (p.isActive !== undefined) return p.isActive;
  if (p.is_active !== undefined) return p.is_active;
  return true;
}
function popupCta(p: PopupAdvertisement) {
  return p.ctaText ?? p.cta_text ?? "";
}
function popupCtaUrl(p: PopupAdvertisement) {
  return p.ctaUrl ?? p.cta_url ?? "";
}
function popupDismissed(p: PopupAdvertisement) {
  return p.dismissedBy ?? p.dismissed_by ?? [];
}

function targetLabel(role: string) {
  if (role === "STUDENT") return "Students";
  if (role === "MENTOR") return "Mentors";
  if (role === "BOTH") return "Everyone";
  return role;
}

const AdminPopupsView: React.FC<AdminPopupsViewProps> = ({
  popups,
  onAddPopup,
  onUpdatePopup,
  onDeletePopup,
  hideHeader = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupAdvertisement | null>(null);
  const [previewPopup, setPreviewPopup] = useState<PopupAdvertisement | null>(null);
  const [formData, setFormData] = useState<PopupFormState>(defaultForm);

  const openCreate = () => {
    setEditingPopup(null);
    setFormData(defaultForm());
    setIsModalOpen(true);
  };

  const handleEdit = (popup: PopupAdvertisement) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      message: popup.message,
      imageUrl: popupImage(popup),
      ctaText: popupCta(popup),
      ctaUrl: popupCtaUrl(popup),
      backgroundColor: popupBg(popup),
      textColor: popupFg(popup),
      targetRole: (popupTarget(popup) as PopupFormState["targetRole"]) || "STUDENT",
      startDate: toDateOnly(popupStart(popup)),
      endDate: toDateOnly(popupEnd(popup)),
      isActive: popupActive(popup),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim() || !formData.startDate || !formData.endDate) {
      return;
    }

    const payload: Partial<PopupAdvertisement> = {
      title: formData.title.trim(),
      message: formData.message.trim(),
      imageUrl: formData.imageUrl.trim() || null,
      ctaText: formData.ctaText.trim() || null,
      ctaUrl: formData.ctaUrl.trim() || null,
      backgroundColor: formData.backgroundColor,
      textColor: formData.textColor,
      targetRole: formData.targetRole,
      startDate: toStartIso(formData.startDate),
      endDate: toEndIso(formData.endDate),
      isActive: formData.isActive,
    };

    if (editingPopup) {
      onUpdatePopup({ ...editingPopup, ...payload } as PopupAdvertisement);
    } else {
      onAddPopup(payload);
    }
    setIsModalOpen(false);
    setEditingPopup(null);
    setFormData(defaultForm());
  };

  const getStatus = (popup: PopupAdvertisement) => {
    const now = new Date();
    const start = new Date(popupStart(popup));
    const end = new Date(popupEnd(popup));

    if (!popupActive(popup)) return { label: "Inactive", color: "bg-slate-500/20 text-slate-400" };
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { label: "Unknown", color: "bg-slate-500/20 text-slate-400" };
    }
    if (now < start) return { label: "Scheduled", color: "bg-amber-500/20 text-amber-400" };
    if (now > end) return { label: "Expired", color: "bg-rose-500/20 text-rose-400" };
    return { label: "Active", color: "bg-emerald-500/20 text-emerald-400" };
  };

  return (
    <div className={`space-y-3 ${hideHeader ? "" : "p-6"}`}>
      {!hideHeader && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xl font-bold text-white">Ad Pop-ups</h2>
            <p className="text-sm text-slate-500">Design and schedule advertising pop-ups for users.</p>
          </div>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Pop-up
          </Button>
        </header>
      )}

      {hideHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Ad Campaigns</h3>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Pop-up
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {popups.length > 0 ? (
          popups.map((popup) => {
            const status = getStatus(popup);
            const bg = popupBg(popup);
            const fg = popupFg(popup);
            const img = popupImage(popup);
            const start = popupStart(popup);
            const end = popupEnd(popup);
            const dismissed = popupDismissed(popup);

            return (
              <div
                key={popup.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div
                    className="w-full sm:w-40 aspect-video rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-800 shrink-0"
                    style={{ backgroundColor: bg }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover opacity-50" />
                    ) : (
                      <Palette className="w-8 h-8 text-white/20" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider line-clamp-1" style={{ color: fg }}>
                        {popup.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-white truncate">{popup.title}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">{popup.message}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewPopup(popup)}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors cursor-pointer"
                          aria-label="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(popup)}
                          className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePopup(popup.id)}
                          className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {start ? new Date(start).toLocaleDateString() : "—"} –{" "}
                        {end ? new Date(end).toLocaleDateString() : "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        {targetLabel(popupTarget(popup))}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                        {dismissed.length} dismissed
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                        {popupCta(popup) || "No CTA"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
            <Rocket className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            No pop-ups yet. Create one to engage users.
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPopup(null);
        }}
        title={editingPopup ? "Edit Pop-up" : "Create Pop-up"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title">
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Summer Bootcamp 2026"
            />
          </FormField>

          <FormField label="Message">
            <Textarea
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="What should the pop-up say?"
              rows={3}
            />
          </FormField>

          <FormField label="Image URL (optional)">
            <Input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CTA Text">
              <Input
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder="Learn More"
              />
            </FormField>
            <FormField label="CTA URL">
              <Input
                type="url"
                value={formData.ctaUrl}
                onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                placeholder="https://..."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Background">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 p-1 cursor-pointer"
                />
                <Input
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  className="uppercase"
                />
              </div>
            </FormField>
            <FormField label="Text Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 p-1 cursor-pointer"
                />
                <Input
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="uppercase"
                />
              </div>
            </FormField>
          </div>

          <FormField label="Target Audience">
            <SelectMenu
              value={formData.targetRole}
              onChange={(v) =>
                setFormData({ ...formData, targetRole: v as PopupFormState["targetRole"] })
              }
              options={[
                { value: "STUDENT", label: "Students Only" },
                { value: "MENTOR", label: "Mentors Only" },
                { value: "BOTH", label: "Everyone" },
              ]}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Date">
              <DatePicker
                value={formData.startDate}
                onChange={(v) => setFormData({ ...formData, startDate: v })}
              />
            </FormField>
            <FormField label="End Date">
              <DatePicker
                value={formData.endDate}
                onChange={(v) => setFormData({ ...formData, endDate: v })}
                min={formData.startDate || undefined}
              />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            Active and visible
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingPopup(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">{editingPopup ? "Update Pop-up" : "Create Pop-up"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!previewPopup}
        onClose={() => setPreviewPopup(null)}
        size="lg"
        title="Preview"
      >
        {previewPopup && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: popupBg(previewPopup),
              color: popupFg(previewPopup),
            }}
          >
            {popupImage(previewPopup) && (
              <div className="h-48 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={popupImage(previewPopup)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-8 text-center space-y-4">
              <h3 className="text-2xl font-bold tracking-tight">{previewPopup.title}</h3>
              <p className="opacity-90 leading-relaxed">{previewPopup.message}</p>
              {popupCta(previewPopup) && (
                <a
                  href={popupCtaUrl(previewPopup) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: popupFg(previewPopup),
                    color: popupBg(previewPopup),
                  }}
                >
                  {popupCta(previewPopup)}
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPopupsView;
