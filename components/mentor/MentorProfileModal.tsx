"use client";

import React, { useEffect, useState } from "react";
import type { Mentor, Meeting } from "@/lib/types";
import {
  Mail,
  Phone,
  School,
  Calendar,
  StickyNote,
  History,
  Clock,
  Plus,
  Save,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Avatar";
import { DatePicker } from "@/components/ui/DatePicker";

interface MentorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
  meetings: Meeting[];
  onUpdateProfile: (mentorId: string, data: Partial<Mentor>) => void;
  onAddMeeting: (meeting: Partial<Meeting>) => void;
  onUpdateMeeting: (meetingId: string, data: Partial<Meeting>) => void;
  /** Render as inline page panel instead of a modal dialog */
  embedded?: boolean;
}

const MentorProfileModal: React.FC<MentorProfileModalProps> = ({
  isOpen,
  onClose,
  mentor,
  meetings,
  onUpdateProfile,
  onAddMeeting,
  onUpdateMeeting,
  embedded = false,
}) => {
  const [notes, setNotes] = useState(mentor.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: mentor.email,
    phone: mentor.phone || "",
    school: mentor.school || "",
    graduationYear: mentor.graduationYear || "",
    managerScore: mentor.managerScore || 0,
  });

  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    date: new Date().toISOString().split("T")[0],
    duration: 30,
    summary: "",
    notes: "",
  });

  useEffect(() => {
    setNotes(mentor.notes || "");
    setProfileForm({
      email: mentor.email,
      phone: mentor.phone || "",
      school: mentor.school || "",
      graduationYear: mentor.graduationYear || "",
      managerScore: mentor.managerScore || 0,
    });
    setIsEditingNotes(false);
    setIsEditingProfile(false);
    setIsAddingMeeting(false);
    setEditingMeetingId(null);
  }, [
    mentor.id,
    mentor.notes,
    mentor.email,
    mentor.phone,
    mentor.school,
    mentor.graduationYear,
    mentor.managerScore,
  ]);

  const managerMeetings = meetings
    .filter(
      (m) =>
        m.type === "MANAGER_MEETING" &&
        m.completed &&
        (m.mentorId || m.mentor_id) === mentor.id,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveNotes = () => {
    onUpdateProfile(mentor.id, { notes });
    setIsEditingNotes(false);
  };

  const handleSaveProfile = () => {
    onUpdateProfile(mentor.id, profileForm);
    setIsEditingProfile(false);
  };

  const handleSaveMeeting = () => {
    const isoDate = new Date(`${meetingForm.date}T12:00:00`).toISOString();

    if (editingMeetingId) {
      onUpdateMeeting(editingMeetingId, {
        ...meetingForm,
        date: isoDate,
      });
    } else {
      onAddMeeting({
        ...meetingForm,
        mentorId: mentor.id,
        completed: true,
        type: "MANAGER_MEETING",
        title: "Management Sync",
        date: isoDate,
      });
    }
    setIsAddingMeeting(false);
    setEditingMeetingId(null);
    setMeetingForm({
      date: new Date().toISOString().split("T")[0],
      duration: 30,
      summary: "",
      notes: "",
    });
  };

  const startEditMeeting = (meeting: Meeting) => {
    const dateObj = new Date(meeting.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");

    setMeetingForm({
      date: `${year}-${month}-${day}`,
      duration: meeting.duration || 30,
      summary: meeting.summary || "",
      notes: meeting.notes || "",
    });
    setEditingMeetingId(meeting.id);
    setIsAddingMeeting(true);
  };

  if (!isOpen && !embedded) return null;

  const body = (
      <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1">
        {!embedded && (
        <div className="flex items-center gap-4">
          <Avatar name={mentor.name} src={mentor.avatar} size="lg" className="rounded-xl" />
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-400">{mentor.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Compliance {mentor.complianceScore ?? 0}%
              </span>
              {mentor.managerScore !== undefined && (
                <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Manager {mentor.managerScore}/100
                </span>
              )}
            </div>
          </div>
        </div>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Profile details
            </h4>
            {!isEditingProfile ? (
              <Button size="sm" variant="ghost" onClick={() => setIsEditingProfile(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsEditingProfile(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  onClick={handleSaveProfile}
                >
                  Save
                </Button>
              </div>
            )}
          </div>

          {isEditingProfile ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Email">
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Dental school">
                <Input
                  value={profileForm.school}
                  onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                />
              </FormField>
              <FormField label="Graduation year">
                <Input
                  value={profileForm.graduationYear}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, graduationYear: e.target.value })
                  }
                />
              </FormField>
              <FormField label="Manager score (0–100)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={profileForm.managerScore}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      managerScore: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </FormField>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={<Mail className="w-4 h-4" />} text={mentor.email} />
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                text={mentor.phone || "Not provided"}
              />
              <InfoRow
                icon={<School className="w-4 h-4" />}
                text={mentor.school || "Not provided"}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                text={`Class of ${mentor.graduationYear || "N/A"}`}
              />
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <StickyNote className="w-3.5 h-3.5" />
              Internal notes
            </h4>
            {!isEditingNotes && (
              <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(true)}>
                Edit
              </Button>
            )}
          </div>
          {isEditingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this mentor…"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsEditingNotes(false)}>
                  Cancel
                </Button>
                <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSaveNotes}>
                  Save notes
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300 italic">
              {mentor.notes || "No internal notes added yet."}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <History className="w-3.5 h-3.5" />
              Management meetings
            </h4>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditingMeetingId(null);
                setMeetingForm({
                  date: new Date().toISOString().split("T")[0],
                  duration: 30,
                  summary: "",
                  notes: "",
                });
                setIsAddingMeeting(true);
              }}
            >
              Log meeting
            </Button>
          </div>

          {isAddingMeeting && (
            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {editingMeetingId ? "Edit meeting" : "Log completed meeting"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Date">
                  <DatePicker
                    value={meetingForm.date}
                    onChange={(date) => setMeetingForm({ ...meetingForm, date })}
                  />
                </FormField>
                <FormField label="Duration (minutes)">
                  <Input
                    type="number"
                    value={meetingForm.duration}
                    onChange={(e) =>
                      setMeetingForm({
                        ...meetingForm,
                        duration: Number.parseInt(e.target.value, 10) || 30,
                      })
                    }
                  />
                </FormField>
                <FormField label="Summary" className="sm:col-span-2">
                  <Textarea
                    value={meetingForm.summary}
                    onChange={(e) => setMeetingForm({ ...meetingForm, summary: e.target.value })}
                    placeholder="What was discussed?"
                    rows={3}
                  />
                </FormField>
                <FormField label="Private notes" className="sm:col-span-2">
                  <Textarea
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                    placeholder="Internal manager notes…"
                    rows={3}
                  />
                </FormField>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsAddingMeeting(false);
                    setEditingMeetingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveMeeting}>
                  {editingMeetingId ? "Update meeting" : "Save meeting"}
                </Button>
              </div>
            </div>
          )}

          {managerMeetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-sm text-slate-500">
              No management meetings logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {managerMeetings.map((meeting, idx) => (
                <div key={meeting.id} className="relative pl-7">
                  {idx !== managerMeetings.length - 1 && (
                    <div className="absolute bottom-0 left-[11px] top-6 w-px bg-slate-800" />
                  )}
                  <div className="absolute left-0 top-1.5 flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-slate-800 bg-slate-900">
                    <Clock className="h-3 w-3 text-slate-500" />
                  </div>
                  <div className="group rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {new Date(meeting.date).toLocaleDateString()} · {meeting.duration || 30}{" "}
                        min
                      </p>
                      <button
                        type="button"
                        onClick={() => startEditMeeting(meeting)}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-500 opacity-0 transition-opacity hover:text-indigo-400 group-hover:opacity-100"
                      >
                        Edit
                      </button>
                    </div>
                    {meeting.summary && (
                      <p className="text-sm text-slate-300">{meeting.summary}</p>
                    )}
                    {meeting.notes && (
                      <p className="mt-1 text-xs italic text-slate-500">{meeting.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
  );

  if (embedded) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        {body}
      </div>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={mentor.name}
      description={`${(mentor.role || "MENTOR").replace("_", " ")} · Compliance ${mentor.complianceScore ?? 0}%`}
      size="xl"
      fullHeight
    >
      {body}
    </Modal>
  );
};

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <span className="text-slate-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default MentorProfileModal;
