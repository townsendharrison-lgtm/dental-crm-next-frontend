"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  Calendar,
  User,
  Send,
  Filter,
  CheckCircle,
  Trash2,
  Edit2,
  ChevronDown,
} from "lucide-react";
import type { UserRole, StaffTask, Mentor, AuthUser } from "@/lib/types";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { usePageHeaderAction } from "@/lib/hooks/usePageHeaderAction";
import { Dropdown, DropdownItem, DropdownLabel } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DatePicker } from "@/components/ui/DatePicker";

function taskAssignedTo(t: StaffTask) {
  return t.assigned_to || t.assignedTo || "";
}
function taskDueDate(t: StaffTask) {
  return t.due_date || t.dueDate || "";
}
function taskStudentName(t: StaffTask) {
  return t.studentName || t.studentUser?.name || "";
}

const emptyTask = (): Partial<StaffTask> => ({
  task: "",
  description: "",
  dueDate: new Date().toISOString().split("T")[0],
  priority: "MEDIUM",
  assignedTo: "",
});

interface StaffTasksViewProps {
  role: UserRole;
  currentUserId: string;
  tasks: StaffTask[];
  mentors: Mentor[];
  /** Optional extra assignees (e.g. mentor managers) for the Assign To dropdown */
  assignees?: Array<Pick<AuthUser, "id" | "name" | "role"> | Mentor>;
  onAddTask: (task: Partial<StaffTask>) => void;
  onUpdateTask: (task: StaffTask) => void;
  onUpdateTaskStatus: (taskId: string, status: "PENDING" | "COMPLETED" | "OVERDUE") => void;
  onDeleteTask: (taskId: string) => void;
}

const StaffTasksView: React.FC<StaffTasksViewProps> = ({
  role,
  currentUserId,
  tasks,
  mentors,
  assignees,
  onAddTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
}) => {
  const filteredMentors = React.useMemo(
    () => mentors.filter((m) => m.role !== "ADMIN"),
    [mentors],
  );
  const assignableStaff = React.useMemo(() => {
    if (assignees && assignees.length > 0) return assignees;
    return filteredMentors;
  }, [assignees, filteredMentors]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [newTask, setNewTask] = useState<Partial<StaffTask>>(emptyTask);

  const canManageTasks = role === "ADMIN";

  const openCreateModal = () => {
    setEditingTask(null);
    setNewTask(emptyTask());
    setIsAddModalOpen(true);
  };

  usePageHeaderAction(
    canManageTasks
      ? {
          label: "Assign Task",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateModal,
        }
      : null,
  );

  const visibleTasks = tasks.filter((t) => role === "ADMIN" || taskAssignedTo(t) === currentUserId);

  const filteredTasks = visibleTasks
    .filter((t) => {
      if (filterStatus === "ALL") return true;
      return t.status === filterStatus;
    })
    .sort((a, b) => new Date(taskDueDate(a)).getTime() - new Date(taskDueDate(b)).getTime());

  const pendingCount = visibleTasks.filter((t) => t.status !== "COMPLETED").length;
  const completedCount = visibleTasks.filter((t) => t.status === "COMPLETED").length;

  const filterLabel =
    filterStatus === "ALL"
      ? "All Status"
      : filterStatus === "PENDING"
        ? "Pending"
        : "Completed";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.task?.trim() || !newTask.dueDate) return;
    if (role === "ADMIN" && !editingTask && !newTask.assignedTo) return;

    const [y, m, d] = (newTask.dueDate || "").split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        ...newTask,
        assignedTo: newTask.assignedTo || taskAssignedTo(editingTask),
        dueDate: date.toISOString(),
      } as StaffTask);
    } else {
      onAddTask({
        ...newTask,
        assignedBy: currentUserId,
        status: "PENDING",
        dueDate: date.toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    handleCloseModal();
  };

  const handleEdit = (task: StaffTask) => {
    setEditingTask(task);

    const d = new Date(taskDueDate(task));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");

    setNewTask({
      task: task.task,
      description: task.description || "",
      dueDate: `${year}-${month}-${day}`,
      priority: task.priority,
      assignedTo: taskAssignedTo(task),
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingTask(null);
    setNewTask(emptyTask());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-rose-400 bg-rose-400/10 border-rose-400/20";
      case "MEDIUM":
        return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "LOW":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-400">
            {pendingCount} Pending
          </span>
          <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
            {completedCount} Done
          </span>
        </div>

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
          <DropdownLabel>Filter by status</DropdownLabel>
          <DropdownItem
            className={filterStatus === "ALL" ? "bg-surface-muted text-foreground" : undefined}
            onClick={() => setFilterStatus("ALL")}
          >
            All Status
          </DropdownItem>
          <DropdownItem
            className={filterStatus === "PENDING" ? "bg-surface-muted text-foreground" : undefined}
            onClick={() => setFilterStatus("PENDING")}
          >
            Pending
          </DropdownItem>
          <DropdownItem
            className={filterStatus === "COMPLETED" ? "bg-surface-muted text-foreground" : undefined}
            onClick={() => setFilterStatus("COMPLETED")}
          >
            Completed
          </DropdownItem>
        </Dropdown>
      </div>

      <div className="grid gap-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all group ${
                task.status === "COMPLETED" ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTaskStatus(
                        task.id,
                        task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
                      )
                    }
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      task.status === "COMPLETED"
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-700 hover:border-indigo-500"
                    }`}
                    aria-label={task.status === "COMPLETED" ? "Mark pending" : "Mark completed"}
                  >
                    {task.status === "COMPLETED" && <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                  <div className="min-w-0">
                    <h4
                      className={`text-base font-bold mb-1 truncate ${
                        task.status === "COMPLETED" ? "text-slate-500 line-through" : "text-white"
                      }`}
                    >
                      {task.task}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-slate-500 mb-2 line-clamp-2">
                        {task.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                          part.match(/^https?:\/\//) ? (
                            <a
                              key={i}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline break-all"
                            >
                              {part}
                            </a>
                          ) : (
                            part
                          ),
                        )}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-widest ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        Due{" "}
                        {parseLocalDate(taskDueDate(task)).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      {taskStudentName(task) && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                          <User className="w-3 h-3" />
                          {taskStudentName(task)}
                        </div>
                      )}
                      {role === "ADMIN" && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <User className="w-3 h-3 text-indigo-400" />
                          {task.assignedToUser?.name ||
                            mentors.find((m) => m.id === taskAssignedTo(task))?.name ||
                            assignableStaff.find((m) => m.id === taskAssignedTo(task))?.name ||
                            "Staff"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {canManageTasks && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(task)}
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:text-rose-400"
                      onClick={() => onDeleteTask(task.id)}
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-xl">
            <CheckSquare className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-white mb-1">No tasks found</h4>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              {filterStatus === "ALL"
                ? "You're all caught up. Assigned tasks will show up here."
                : `No ${filterStatus.toLowerCase()} tasks right now.`}
            </p>
          </div>
        )}
      </div>

      <Modal
        open={isAddModalOpen}
        onClose={handleCloseModal}
        title={editingTask ? "Edit Task" : "Assign New Task"}
        description="Internal staff assignment"
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              className="flex-[2]"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={() => {
                const form = document.getElementById("staff-task-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              {editingTask ? "Update Task" : "Assign Task"}
            </Button>
          </div>
        }
      >
        <form id="staff-task-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Task Title" required>
            <Input
              required
              value={newTask.task || ""}
              onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
              placeholder="e.g. Review Mentor Compliance"
            />
          </FormField>

          <FormField label="Description (Optional)">
            <Textarea
              value={newTask.description || ""}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Provide more context about the task..."
              className="min-h-[96px]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Due Date" required>
              <DatePicker
                value={newTask.dueDate || ""}
                onChange={(dueDate) => setNewTask({ ...newTask, dueDate })}
              />
            </FormField>
            <FormField label="Priority">
              <SelectMenu
                value={newTask.priority || "MEDIUM"}
                onChange={(priority) =>
                  setNewTask({
                    ...newTask,
                    priority: priority as StaffTask["priority"],
                  })
                }
                options={[
                  { value: "HIGH", label: "High" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "LOW", label: "Low" },
                ]}
              />
            </FormField>
          </div>

          {role === "ADMIN" && (
            <FormField label="Assign To" required>
              <SelectMenu
                value={newTask.assignedTo || ""}
                placeholder="Select Staff Member"
                onChange={(assignedTo) => setNewTask({ ...newTask, assignedTo })}
                options={[
                  { value: "", label: "Select Staff Member" },
                  ...assignableStaff.map((m) => ({
                    value: m.id,
                    label: `${m.name}${m.role ? ` (${m.role === "MENTOR_MANAGER" ? "Manager" : "Mentor"})` : ""}`,
                  })),
                ]}
              />
            </FormField>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default StaffTasksView;
