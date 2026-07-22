"use client";

import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Plus,
  Users,
  Clock,
  Video,
  Filter,
  User,
  Globe,
  Pencil,
  Trash2,
} from "lucide-react";
import type { UserRole, Meeting, MeetingAudience, ActionItem, Student, Mentor, StaffTask } from "@/lib/types";
import type { CreateMeetingPayload } from "@/lib/api/meetings";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";

function meetingMentorId(m: Meeting) {
  return m.mentor_id || m.mentorId || "";
}
function meetingStudentId(m: Meeting) {
  return m.student_id ?? m.studentId ?? "";
}
function meetingAudience(m: Meeting): MeetingAudience {
  if (
    m.audience === "ADMIN_DIRECT" ||
    m.audience === "STUDENT" ||
    m.audience === "MENTORS" ||
    m.audience === "STAFF" ||
    m.audience === "GLOBAL"
  ) {
    return m.audience;
  }
  if ((m.audience as string) === "CUSTOM" || m.type === "MANAGER_MEETING") return "STAFF";
  if (m.type === "GENERAL" && !(m.student_id || m.studentId)) return "MENTORS";
  return "STUDENT";
}
function isBroadcastMeeting(m: Meeting) {
  const a = meetingAudience(m);
  return a === "MENTORS" || a === "GLOBAL";
}
function typeForAudience(audience: MeetingAudience): Meeting["type"] {
  switch (audience) {
    case "ADMIN_DIRECT":
    case "STUDENT":
      return "STUDENT_MEETING";
    case "STAFF":
      return "MANAGER_MEETING";
    case "MENTORS":
    case "GLOBAL":
      return "GENERAL";
  }
}
function audienceLabel(audience: MeetingAudience) {
  switch (audience) {
    case "ADMIN_DIRECT":
      return "Admin 1:1";
    case "STUDENT":
      return "Student";
    case "MENTORS":
      return "All mentors";
    case "STAFF":
      return "Staff";
    case "GLOBAL":
      return "Webinar";
  }
}
function audienceBadgeClass(audience: MeetingAudience) {
  switch (audience) {
    case "ADMIN_DIRECT":
      return "bg-violet-500/20 text-violet-400 border-violet-500/20";
    case "STUDENT":
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/20";
    case "MENTORS":
      return "bg-teal-500/20 text-teal-400 border-teal-500/20";
    case "STAFF":
      return "bg-amber-500/20 text-amber-400 border-amber-500/20";
    case "GLOBAL":
      return "bg-sky-500/20 text-sky-400 border-sky-500/20";
  }
}
function actionStudentId(t: ActionItem) {
  return t.student_id || t.studentId || "";
}
function actionDueDate(t: ActionItem) {
  return t.due_date || t.dueDate || "";
}
function staffAssignedTo(t: StaffTask) {
  return t.assigned_to || t.assignedTo || "";
}
function staffDueDate(t: StaffTask) {
  return t.due_date || t.dueDate || "";
}
function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isMeetingEventType(type: string) {
  return type === "MEETING" || type === "MANAGER_MEETING";
}

const emptyMeetingForm = (role: UserRole, currentUserId: string) => ({
  title: "",
  date: new Date().toISOString().split("T")[0],
  time: "12:00",
  ampm: "PM" as "AM" | "PM",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  duration: 30,
  audience: "STUDENT" as MeetingAudience,
  counterpartyType: "student" as "student" | "mentor",
  mentorId: role === "MENTOR" ? currentUserId : "",
  studentId: "",
  attendeeIds: [] as string[],
  notes: "",
  link: "",
});

function audienceOptionsForRole(role: UserRole): { value: MeetingAudience; label: string }[] {
  const all: { value: MeetingAudience; label: string }[] = [
    { value: "ADMIN_DIRECT", label: "Admin 1:1 meeting" },
    { value: "STUDENT", label: "Student mentoring" },
    { value: "MENTORS", label: "All mentors + admin" },
    { value: "STAFF", label: "Mentor + manager" },
    { value: "GLOBAL", label: "Global webinar" },
  ];
  if (role === "ADMIN") return all;
  return all.filter((o) => o.value === "STUDENT" || o.value === "STAFF");
}

interface ScheduleViewProps {
  role: UserRole;
  currentUserId: string;
  meetings: Meeting[];
  actionItems: ActionItem[];
  staffTasks: StaffTask[];
  students: Student[];
  mentors: Mentor[];
  /** Mentors + managers + admins for invitee multi-select */
  inviteDirectory?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
  }>;
  onAddMeeting: (
    meeting: Partial<Meeting> & {
      attendees?: string[];
      audience?: MeetingAudience;
      counterpartyType?: "student" | "mentor";
    },
  ) => void;
  onUpdateMeeting?: (
    id: string,
    updates: Partial<CreateMeetingPayload & { completed?: boolean }>,
  ) => void;
  onDeleteMeeting?: (id: string) => void;
  onAttendMeeting?: (meetingId: string) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  role,
  currentUserId,
  meetings,
  actionItems,
  staffTasks,
  students,
  mentors,
  inviteDirectory = [],
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onAttendMeeting,
}) => {
  const filteredMentors = React.useMemo(
    () => mentors.filter((m) => m.role === "MENTOR" || !m.role),
    [mentors],
  );
  const inviteCandidates = React.useMemo(() => {
    if (inviteDirectory.length > 0) {
      return inviteDirectory.filter((u) => u.id !== currentUserId);
    }
    return mentors.filter((m) => m.id !== currentUserId);
  }, [inviteDirectory, mentors, currentUserId]);
  const searchParams = useSearchParams();
  const focusMeetingId = searchParams.get("meetingId");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [highlightedMeetingId, setHighlightedMeetingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [filterMentorId, setFilterMentorId] = useState<string>(
    role === "ADMIN" || role === "MENTOR_MANAGER" ? "all" : currentUserId,
  );
  const [newMeeting, setNewMeeting] = useState(() => emptyMeetingForm(role, currentUserId));

  const calendarRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);

  const canAddEvent = role === "ADMIN" || role === "MENTOR_MANAGER" || role === "MENTOR";

  const canManageMeeting = (meeting: Meeting) => {
    if (!onUpdateMeeting || !onDeleteMeeting) return false;
    const audience = meetingAudience(meeting);
    if (role === "ADMIN") return true;
    if (role === "MENTOR_MANAGER") {
      return audience === "STUDENT" || audience === "STAFF" || audience === "GLOBAL";
    }
    if (role === "MENTOR") {
      return (
        meetingMentorId(meeting) === currentUserId &&
        (audience === "STUDENT" || audience === "STAFF")
      );
    }
    return false;
  };

  usePageHeaderAction(
    canAddEvent
      ? {
          label: "Add Event",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            setEditingMeetingId(null);
            setNewMeeting(emptyMeetingForm(role, currentUserId));
            setIsAddModalOpen(true);
          },
        }
      : null,
  );

  useLayoutEffect(() => {
    const el = calendarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const next = Math.round(el.getBoundingClientRect().height);
      setSidebarHeight(next > 0 ? next : null);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [currentDate, filterMentorId, meetings, actionItems, staffTasks]);

  // Deep-link from notification: open the meeting's day and highlight it
  useEffect(() => {
    if (!focusMeetingId) return;
    const meeting = meetings.find((m) => m.id === focusMeetingId);
    if (!meeting) return;
    const d = new Date(meeting.date);
    if (Number.isNaN(d.getTime())) return;
    setSelectedDate(d);
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setHighlightedMeetingId(meeting.id);
  }, [focusMeetingId, meetings]);

  useEffect(() => {
    if (!highlightedMeetingId) return;
    const el = document.getElementById(`schedule-event-${highlightedMeetingId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightedMeetingId, selectedDate]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const nextYear = () => setCurrentDate(new Date(year + 1, currentDate.getMonth(), 1));
  const prevYear = () => setCurrentDate(new Date(year - 1, currentDate.getMonth(), 1));

  const calendarEvents = useMemo(() => {
    let filteredMeetings = meetings;
    let filteredTasks = actionItems;
    let filteredStaffTasks = staffTasks;

    if (role === "MENTOR") {
      const mentorStudentIds = new Set(
        mentors.find((m) => m.id === currentUserId)?.studentIds ||
          students.map((s) => s.id),
      );
      filteredMeetings = meetings.filter((m) => {
        if (meetingMentorId(m) === currentUserId) return true;
        if ((m.attendees || []).includes(currentUserId)) return true;
        const sid = meetingStudentId(m);
        if (sid && mentorStudentIds.has(sid)) return true;
        return isBroadcastMeeting(m);
      });
      filteredTasks = actionItems.filter((t) => mentorStudentIds.has(actionStudentId(t)));
      filteredStaffTasks = staffTasks.filter(
        (t) => staffAssignedTo(t) === currentUserId && t.status !== "COMPLETED",
      );
    } else if (role === "MENTOR_MANAGER" || role === "ADMIN") {
      if (filterMentorId === "all") {
        if (role === "ADMIN") {
          filteredMeetings = meetings;
          filteredTasks = actionItems;
          filteredStaffTasks = staffTasks;
        } else {
          const adminIds = mentors.filter((m) => m.role === "ADMIN").map((m) => m.id);
          filteredMeetings = meetings.filter((m) => !adminIds.includes(meetingMentorId(m)));
          filteredTasks = actionItems;
          filteredStaffTasks = staffTasks.filter((t) => !adminIds.includes(staffAssignedTo(t)));
        }
      } else {
        filteredMeetings = meetings.filter(
          (m) => meetingMentorId(m) === filterMentorId || isBroadcastMeeting(m),
        );
        const mentorStudentIds = mentors.find((m) => m.id === filterMentorId)?.studentIds || [];
        filteredTasks = actionItems.filter((t) => mentorStudentIds.includes(actionStudentId(t)));
        filteredStaffTasks = staffTasks.filter((t) => staffAssignedTo(t) === filterMentorId);
      }
    }

    return [
      ...filteredMeetings.map((m) => {
        const mentor = mentors.find((men) => men.id === meetingMentorId(m));
        const audience = meetingAudience(m);
        return {
          id: m.id,
          title: `${m.title || "Meeting"}${mentor ? ` - ${mentor.name}` : ""}`,
          date: new Date(m.date),
          type: m.type === "MANAGER_MEETING" ? "MANAGER_MEETING" : "MEETING",
          audience,
          isMine: meetingMentorId(m) === currentUserId,
          data: m,
        };
      }),
      ...filteredTasks.map((t) => {
        const sid = actionStudentId(t);
        const mentor = mentors.find((m) => (m.studentIds || []).includes(sid));
        return {
          id: t.id,
          title: `Student Task: ${t.task}${mentor ? ` - ${mentor.name}` : ""}`,
          date: new Date(actionDueDate(t)),
          type: "TASK_DUE",
          audience: undefined as MeetingAudience | undefined,
          isMine: mentor?.id === currentUserId,
          data: t,
        };
      }),
      ...filteredStaffTasks.map((t) => {
        const mentor = mentors.find((m) => m.id === staffAssignedTo(t));
        return {
          id: t.id,
          title: `Task: ${t.task}${mentor ? ` - ${mentor.name}` : ""}`,
          date: new Date(staffDueDate(t)),
          type: "STAFF_TASK",
          audience: undefined as MeetingAudience | undefined,
          isMine: staffAssignedTo(t) === currentUserId,
          data: t,
        };
      }),
    ];
  }, [meetings, actionItems, staffTasks, role, currentUserId, filterMentorId, mentors]);

  const getEventsForDate = (date: Date) =>
    calendarEvents.filter(
      (e) =>
        e.date.getDate() === date.getDate() &&
        e.date.getMonth() === date.getMonth() &&
        e.date.getFullYear() === date.getFullYear(),
    );

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const upcomingGlobals = useMemo(
    () =>
      meetings
        .filter((m) => isBroadcastMeeting(m) && !m.completed && new Date(m.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [meetings],
  );

  const openEditMeeting = (meeting: Meeting) => {
    const d = new Date(meeting.date);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    setEditingMeetingId(meeting.id);
    const audience = meetingAudience(meeting);
    const sid = meetingStudentId(meeting) || "";
    setNewMeeting({
      title: meeting.title || "",
      date: toYmd(d),
      time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      ampm,
      timezone: meeting.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      duration: meeting.duration || 30,
      audience,
      counterpartyType:
        audience === "ADMIN_DIRECT" && !sid ? "mentor" : "student",
      mentorId: meetingMentorId(meeting) || "",
      studentId: sid,
      attendeeIds: meeting.attendees || [],
      notes: meeting.notes || "",
      link: meeting.link || "",
    });
    setIsAddModalOpen(true);
  };

  const closeEventModal = () => {
    setIsAddModalOpen(false);
    setEditingMeetingId(null);
    setNewMeeting(emptyMeetingForm(role, currentUserId));
  };

  const toggleAttendee = (id: string) => {
    setNewMeeting((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(id)
        ? prev.attendeeIds.filter((x) => x !== id)
        : [...prev.attendeeIds, id],
    }));
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.title.trim() || !newMeeting.date || !newMeeting.time) return;

    const { audience, attendeeIds, counterpartyType } = newMeeting;
    if (audience === "ADMIN_DIRECT") {
      if (counterpartyType === "student" && !newMeeting.studentId) return;
      if (counterpartyType === "mentor" && !newMeeting.mentorId) return;
    }
    if (audience === "STUDENT") {
      if (!newMeeting.studentId) return;
      if (role !== "MENTOR" && !newMeeting.mentorId) return;
    }
    if (audience === "STAFF") {
      if (attendeeIds.length === 0) return;
      if (role !== "MENTOR" && !newMeeting.mentorId) return;
    }

    let [hours, minutes] = newMeeting.time.split(":").map(Number);
    if (newMeeting.ampm === "PM" && hours < 12) hours += 12;
    if (newMeeting.ampm === "AM" && hours === 12) hours = 0;

    const [y, m, d] = newMeeting.date.split("-").map(Number);
    const date = new Date(y, m - 1, d, hours, minutes);

    let mentorId = role === "MENTOR" ? currentUserId : newMeeting.mentorId || currentUserId;
    let studentId: string | undefined;

    if (audience === "ADMIN_DIRECT") {
      if (counterpartyType === "student") {
        studentId = newMeeting.studentId || undefined;
        mentorId = currentUserId;
      } else {
        mentorId = newMeeting.mentorId || currentUserId;
        studentId = undefined;
      }
    } else if (audience === "STUDENT") {
      studentId = newMeeting.studentId || undefined;
    } else {
      studentId = undefined;
    }

    const payload = {
      title: newMeeting.title,
      date: date.toISOString(),
      timezone: newMeeting.timezone,
      duration: newMeeting.duration,
      type: typeForAudience(audience),
      audience,
      attendees: audience === "STUDENT" || audience === "STAFF" ? attendeeIds : [],
      counterpartyType: audience === "ADMIN_DIRECT" ? counterpartyType : undefined,
      mentorId,
      studentId,
      notes: newMeeting.notes || undefined,
      link: newMeeting.link || undefined,
    };

    if (editingMeetingId && onUpdateMeeting) {
      onUpdateMeeting(editingMeetingId, payload);
    } else {
      onAddMeeting({
        ...payload,
        mentor_id: payload.mentorId,
        student_id: payload.studentId ?? null,
      });
    }
    closeEventModal();
  };

  const canJoinAsAttendee = (meeting: Meeting) => {
    if (role !== "ADMIN" && role !== "MENTOR_MANAGER") return false;
    if (!onAttendMeeting) return false;
    if (meetingMentorId(meeting) === currentUserId) return false;
    if ((meeting.attendees || []).includes(currentUserId)) return false;
    if (role === "MENTOR_MANAGER") {
      const a = meetingAudience(meeting);
      return a === "STUDENT" || a === "STAFF" || a === "GLOBAL";
    }
    return true;
  };

  const filterLabel =
    filterMentorId === "all"
      ? "All Schedules"
      : filterMentorId === currentUserId
        ? "My Schedule"
        : filteredMentors.find((m) => m.id === filterMentorId)?.name || "Schedule";

  const renderMeetingActions = (meeting: Meeting) => {
    if (!canManageMeeting(meeting)) return null;
    return (
      <div className="flex gap-1.5">
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          title="Reschedule / edit"
          onClick={() => openEditMeeting(meeting)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8 text-rose-400 hover:text-rose-300"
          title="Delete event"
          onClick={() => setDeletingMeeting(meeting)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  };

  const audienceHint =
    newMeeting.audience === "ADMIN_DIRECT"
      ? "One-on-one with a student or mentor"
      : newMeeting.audience === "MENTORS"
        ? "Visible to all mentors and admins"
        : newMeeting.audience === "GLOBAL"
          ? "All students, mentors, managers, and admins"
          : newMeeting.audience === "STAFF"
            ? "Mentor + managers/mentors/admins invitees"
            : "Student mentoring; optional staff invitees";

  const showStudent =
    newMeeting.audience === "STUDENT" ||
    (newMeeting.audience === "ADMIN_DIRECT" && newMeeting.counterpartyType === "student");
  const showMentorCounterparty =
    newMeeting.audience === "ADMIN_DIRECT" && newMeeting.counterpartyType === "mentor";
  const showMentorAssign =
    (newMeeting.audience === "STUDENT" || newMeeting.audience === "STAFF") && role !== "MENTOR";
  const showInvitees =
    newMeeting.audience === "STUDENT" || newMeeting.audience === "STAFF";
  const inviteesRequired = newMeeting.audience === "STAFF";
  const audienceSelectOptions = audienceOptionsForRole(role);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid lg:grid-cols-3 gap-4 lg:items-start">
        {/* Calendar Grid */}
        <div
          ref={calendarRef}
          className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={prevYear}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  aria-label="Previous year"
                  title="Previous year"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-base font-bold text-white min-w-[8.5rem] text-center">
                {monthName} {year}
              </h3>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  aria-label="Next month"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextYear}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  aria-label="Next year"
                  title="Next year"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {(role === "ADMIN" || role === "MENTOR_MANAGER") && (
              <Dropdown
                align="right"
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Filter className="w-3.5 h-3.5" />}
                    rightIcon={<ChevronDown className="w-3.5 h-3.5" />}
                  >
                    {filterLabel}
                  </Button>
                }
              >
                <DropdownLabel>Filter schedule</DropdownLabel>
                <DropdownItem
                  className={filterMentorId === "all" ? "bg-surface-muted text-foreground" : undefined}
                  onClick={() => setFilterMentorId("all")}
                >
                  All Schedules
                </DropdownItem>
                <DropdownItem
                  className={
                    filterMentorId === currentUserId ? "bg-surface-muted text-foreground" : undefined
                  }
                  onClick={() => setFilterMentorId(currentUserId)}
                >
                  My Schedule
                </DropdownItem>
                {filteredMentors.filter((m) => m.id !== currentUserId).length > 0 && (
                  <DropdownSeparator />
                )}
                {filteredMentors
                  .filter((m) => m.id !== currentUserId)
                  .map((m) => (
                    <DropdownItem
                      key={m.id}
                      className={
                        filterMentorId === m.id ? "bg-surface-muted text-foreground" : undefined
                      }
                      onClick={() => setFilterMentorId(m.id)}
                    >
                      {m.name}
                    </DropdownItem>
                  ))}
              </Dropdown>
            )}
          </div>

          <div className="grid grid-cols-7 border-b border-slate-800">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-800 last:border-0"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day, idx) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected =
                day && selectedDate && day.toDateString() === selectedDate.toDateString();
              const events = day ? getEventsForDate(day) : [];

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDate(day)}
                  className={`min-h-[100px] p-3 border-r border-b border-slate-800 last:border-r-0 transition-all cursor-pointer ${
                    !day ? "bg-slate-950/20" : "hover:bg-slate-800/30"
                  } ${isSelected ? "bg-indigo-600/5" : ""}`}
                >
                  {day && (
                    <>
                      <span
                        className={`text-sm font-bold ${
                          isToday
                            ? "w-7 h-7 bg-indigo-600 text-white rounded-lg inline-flex items-center justify-center"
                            : isSelected
                              ? "text-indigo-400"
                              : "text-slate-500"
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      <div className="mt-2 space-y-1">
                        {events.slice(0, 3).map((event, eIdx) => (
                          <div
                            key={eIdx}
                            className={`text-[9px] px-1.5 py-0.5 rounded-md truncate font-bold border ${
                              event.isMine ? "ring-1 ring-white/40" : ""
                            } ${
                              event.audience
                                ? audienceBadgeClass(event.audience)
                                : event.type === "STAFF_TASK"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {event.audience ? `${audienceLabel(event.audience)} · ` : ""}
                            {event.title}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-[9px] text-slate-600 font-bold pl-1">
                            + {events.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar — height matched to calendar */}
        <div
          className="flex flex-col gap-4 min-h-0"
          style={
            sidebarHeight
              ? { height: sidebarHeight, maxHeight: sidebarHeight }
              : { maxHeight: "100%" }
          }
        >
          <div className="flex-1 min-h-0 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {selectedDate
                  ? selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })
                  : "Select a date"}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {selectedDateEvents.length} Events
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event, idx) => {
                  const meeting = isMeetingEventType(event.type)
                    ? (event.data as Meeting)
                    : null;
                  const inviteeNames =
                    meeting?.resolvedAttendees?.map((u) => u.name).filter(Boolean) || [];
                  const inviteeCount = meeting?.attendees?.length || 0;

                  return (
                    <div
                      key={idx}
                      id={
                        isMeetingEventType(event.type)
                          ? `schedule-event-${event.id}`
                          : undefined
                      }
                      className={`p-4 bg-slate-950 border rounded-lg space-y-3 hover:border-indigo-500/30 transition-all ${
                        highlightedMeetingId === event.id
                          ? "border-indigo-400 ring-2 ring-indigo-500/40"
                          : event.isMine
                            ? "border-indigo-500"
                            : "border-slate-800"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-1">
                          <div
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest w-fit border ${
                              event.audience
                                ? audienceBadgeClass(event.audience)
                                : event.type === "STAFF_TASK"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {event.audience
                              ? audienceLabel(event.audience)
                              : event.type === "STAFF_TASK"
                                ? "TASK"
                                : event.type.replace("_", " ")}
                          </div>
                          {event.isMine && (
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                              Your Event
                            </span>
                          )}
                        </div>
                        {isMeetingEventType(event.type) && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold shrink-0">
                            <Clock className="w-3 h-3" />{" "}
                            {new Date((event.data as Meeting).date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-sm leading-tight mb-1">
                          {event.title}
                        </h4>
                        {isMeetingEventType(event.type) && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> Mentor:{" "}
                            {mentors.find((m) => m.id === meetingMentorId(event.data as Meeting))
                              ?.name || "Unknown"}
                          </p>
                        )}
                        {meeting && (inviteeNames.length > 0 || inviteeCount > 0) && (
                          <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                            <Users className="w-3 h-3 mt-0.5 shrink-0" />
                            {inviteeNames.length > 0
                              ? inviteeNames.join(", ")
                              : `${inviteeCount} invitee${inviteeCount === 1 ? "" : "s"}`}
                          </p>
                        )}
                      </div>

                      {isMeetingEventType(event.type) && meeting && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {meeting.link && (
                            <Button
                              size="sm"
                              className="shrink-0 whitespace-nowrap"
                              leftIcon={<Video className="w-4 h-4" />}
                              onClick={() => window.open(meeting.link!, "_blank")}
                            >
                              Join video
                            </Button>
                          )}
                          {canJoinAsAttendee(meeting) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="shrink-0 whitespace-nowrap"
                              leftIcon={<Users className="w-4 h-4" />}
                              onClick={() => onAttendMeeting?.(meeting.id)}
                            >
                              Join meeting
                            </Button>
                          )}
                          {renderMeetingActions(meeting)}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center">
                  <CalendarIcon className="w-10 h-10 text-slate-800 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No events scheduled for this day.</p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 max-h-[38%] min-h-[9rem] flex flex-col bg-indigo-600 rounded-xl text-white relative overflow-hidden">
            <div className="px-4 pt-4 pb-2 shrink-0 relative z-10">
              <h3 className="text-sm font-bold">Upcoming Global Events</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-2 relative z-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {upcomingGlobals.length === 0 ? (
                <p className="text-sm text-indigo-100/70">No upcoming global events.</p>
              ) : (
                upcomingGlobals.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-white/10 rounded-lg border border-white/10 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">
                          {audienceLabel(meetingAudience(m))} ·{" "}
                          {new Date(m.date).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(m.date).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <h4 className="font-bold text-white text-sm truncate">{m.title}</h4>
                      </div>
                      {canManageMeeting(m) && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Reschedule / edit"
                            onClick={() => openEditMeeting(m)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/40 transition-colors"
                            title="Delete event"
                            onClick={() => setDeletingMeeting(m)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <Users className="absolute -bottom-8 -right-8 w-36 h-36 text-white/10 pointer-events-none" />
          </div>
        </div>
      </div>

      <Modal
        open={isAddModalOpen}
        onClose={closeEventModal}
        title={editingMeetingId ? "Reschedule Event" : "Add New Event"}
        description={
          editingMeetingId
            ? "Update date, time, or details for this event"
            : "Schedule a meeting or task"
        }
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={closeEventModal}>
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              onClick={() => {
                const form = document.getElementById("add-event-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              {editingMeetingId ? "Save changes" : "Create Event"}
            </Button>
          </div>
        }
      >
        <form id="add-event-form" onSubmit={handleSaveEvent} className="space-y-4">
          <FormField label="Event Title" required>
            <Input
              required
              value={newMeeting.title}
              onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
              placeholder="e.g. Mentor Sync Meeting"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date" required>
              <DatePicker
                value={newMeeting.date}
                onChange={(date) => setNewMeeting({ ...newMeeting, date })}
              />
            </FormField>
            <FormField label="Time" required>
              <TimePicker
                time={newMeeting.time}
                ampm={newMeeting.ampm}
                onChange={({ time, ampm }) => setNewMeeting({ ...newMeeting, time, ampm })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Timezone">
              <SelectMenu
                value={newMeeting.timezone}
                leftIcon={<Globe className="h-4 w-4 text-slate-500" />}
                onChange={(timezone) => setNewMeeting({ ...newMeeting, timezone })}
                options={[
                  { value: "America/New_York", label: "Eastern Time (ET)" },
                  { value: "America/Chicago", label: "Central Time (CT)" },
                  { value: "America/Denver", label: "Mountain Time (MT)" },
                  { value: "America/Phoenix", label: "Mountain Time - AZ" },
                  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
                  { value: "UTC", label: "UTC" },
                ]}
              />
            </FormField>
            <FormField label="Duration (min)" required>
              <SelectMenu
                value={String(newMeeting.duration)}
                onChange={(v) => setNewMeeting({ ...newMeeting, duration: parseInt(v, 10) || 30 })}
                options={[15, 30, 45, 60, 90, 120].map((mins) => ({
                  value: String(mins),
                  label: `${mins} min`,
                }))}
              />
            </FormField>
          </div>

          <FormField label="Audience" required hint={audienceHint}>
            <SelectMenu
              value={newMeeting.audience}
              onChange={(audience) =>
                setNewMeeting({
                  ...newMeeting,
                  audience: audience as MeetingAudience,
                  counterpartyType: "student",
                  studentId:
                    audience === "STUDENT" || audience === "ADMIN_DIRECT"
                      ? newMeeting.studentId
                      : "",
                  attendeeIds:
                    audience === "STUDENT" || audience === "STAFF"
                      ? newMeeting.attendeeIds
                      : [],
                  mentorId:
                    role === "MENTOR"
                      ? currentUserId
                      : audience === "STUDENT" ||
                          audience === "STAFF" ||
                          audience === "ADMIN_DIRECT"
                        ? newMeeting.mentorId
                        : newMeeting.mentorId || currentUserId,
                })
              }
              options={audienceSelectOptions}
            />
          </FormField>

          {newMeeting.audience === "ADMIN_DIRECT" && (
            <FormField label="Counterparty" required>
              <SelectMenu
                value={newMeeting.counterpartyType}
                onChange={(counterpartyType) =>
                  setNewMeeting({
                    ...newMeeting,
                    counterpartyType: counterpartyType as "student" | "mentor",
                    studentId: counterpartyType === "student" ? newMeeting.studentId : "",
                    mentorId:
                      counterpartyType === "mentor"
                        ? newMeeting.mentorId
                        : role === "MENTOR"
                          ? currentUserId
                          : "",
                  })
                }
                options={[
                  { value: "student", label: "Student" },
                  { value: "mentor", label: "Mentor" },
                ]}
              />
            </FormField>
          )}

          <FormField label="Event Link (Optional)">
            <Input
              type="url"
              value={newMeeting.link}
              onChange={(e) => setNewMeeting({ ...newMeeting, link: e.target.value })}
              placeholder="https://zoom.us/j/..."
            />
          </FormField>

          {showStudent && (
            <FormField label="Select Student" required>
              <SelectMenu
                value={newMeeting.studentId}
                placeholder="Select student"
                onChange={(studentId) => setNewMeeting({ ...newMeeting, studentId })}
                options={[
                  { value: "", label: "Select student" },
                  ...students
                    .filter((s) =>
                      role === "MENTOR"
                        ? (s.mentorId || s.profile?.mentor_id) === currentUserId
                        : true,
                    )
                    .map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </FormField>
          )}

          {showMentorCounterparty && (
            <FormField label="Select Mentor" required>
              <SelectMenu
                value={newMeeting.mentorId}
                placeholder="Select Mentor"
                onChange={(mentorId) => setNewMeeting({ ...newMeeting, mentorId })}
                options={[
                  { value: "", label: "Select Mentor" },
                  ...filteredMentors.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
            </FormField>
          )}

          {showMentorAssign && (
            <FormField label="Assign to Mentor" required>
              <SelectMenu
                value={newMeeting.mentorId}
                placeholder="Select Mentor"
                onChange={(mentorId) => setNewMeeting({ ...newMeeting, mentorId })}
                options={[
                  { value: "", label: "Select Mentor" },
                  ...filteredMentors.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
            </FormField>
          )}

          {showInvitees && (
            <FormField
              label={inviteesRequired ? "Invitees" : "Invitees (optional)"}
              required={inviteesRequired}
              hint={
                inviteesRequired
                  ? "Select at least one manager, mentor, or admin"
                  : undefined
              }
            >
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2 space-y-1">
                {inviteCandidates.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 py-1">No staff available</p>
                ) : (
                  inviteCandidates
                    .filter((m) => m.id !== newMeeting.mentorId)
                    .map((m) => {
                      const checked = newMeeting.attendeeIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-900 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAttendee(m.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-300">{m.name}</span>
                          {m.role === "MENTOR_MANAGER" && (
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              Manager
                            </span>
                          )}
                          {m.role === "ADMIN" && (
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              Admin
                            </span>
                          )}
                        </label>
                      );
                    })
                )}
              </div>
              {newMeeting.attendeeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {newMeeting.attendeeIds.map((id) => {
                    const m = inviteCandidates.find((x) => x.id === id);
                    if (!m) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleAttendee(id)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      >
                        {m.name} ×
                      </button>
                    );
                  })}
                </div>
              )}
            </FormField>
          )}

          <FormField label="Meeting Notes">
            <Textarea
              value={newMeeting.notes}
              onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
              placeholder="Agenda or notes..."
              className="min-h-[100px]"
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={!!deletingMeeting}
        onClose={() => setDeletingMeeting(null)}
        title="Delete event?"
        description="This permanently removes the event from the schedule."
        size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeletingMeeting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                if (deletingMeeting && onDeleteMeeting) {
                  onDeleteMeeting(deletingMeeting.id);
                }
                setDeletingMeeting(null);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        {deletingMeeting && (
          <p className="text-sm text-slate-300">
            Delete <span className="font-semibold text-white">{deletingMeeting.title}</span> on{" "}
            {new Date(deletingMeeting.date).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            ?
          </p>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleView;
