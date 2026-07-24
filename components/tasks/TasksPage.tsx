"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { useMentors } from "@/lib/hooks/useMentors";
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import StaffTasksView, {
  ASSIGN_SELF,
  ASSIGN_ALL_MENTORS,
  ASSIGN_ALL_MANAGERS,
} from "@/components/tasks/StaffTasksView";
import { toastAction } from "@/lib/utils/toastAction";
import type { StaffTask } from "@/lib/types";

export default function TasksPage() {
  const { user } = useAuth();
  const { role, isAdmin } = useRole();
  const canListMentors = role === "ADMIN" || role === "MENTOR_MANAGER";

  const { data: mentors = [], isLoading: isMentorsLoading } = useMentors(canListMentors);
  const { data: tasks = [], isLoading: isTasksLoading } = useTasks();
  const { data: allUsers = [], isLoading: isUsersLoading } = useAdminUsers(isAdmin);

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const assignees = useMemo(() => {
    if (!isAdmin || !user) return mentors;
    const staff = allUsers.filter(
      (u) => u.role === "MENTOR" || u.role === "MENTOR_MANAGER" || u.role === "ADMIN",
    );
    if (!staff.some((u) => u.id === user.id)) {
      return [
        { id: user.id, name: user.name || user.email || "Me", role: user.role },
        ...staff,
      ];
    }
    return staff;
  }, [isAdmin, allUsers, mentors, user]);

  const resolveAssigneeIds = (target: string): string[] => {
    if (!user) return [];
    if (target === ASSIGN_SELF) return [user.id];
    if (target === ASSIGN_ALL_MENTORS) {
      return assignees.filter((u) => u.role === "MENTOR").map((u) => u.id);
    }
    if (target === ASSIGN_ALL_MANAGERS) {
      return assignees.filter((u) => u.role === "MENTOR_MANAGER").map((u) => u.id);
    }
    return target ? [target] : [];
  };

  if (
    !user ||
    !role ||
    (canListMentors && isMentorsLoading) ||
    isTasksLoading ||
    (isAdmin && isUsersLoading)
  ) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleAddTask = (task: Partial<StaffTask>) => {
    if (!task.assignedTo || !task.task || !task.dueDate) {
      toast.error("Assignee, title, and due date are required");
      return;
    }

    const assigneeIds = resolveAssigneeIds(task.assignedTo);
    if (assigneeIds.length === 0) {
      toast.error("No matching people found for that assignment");
      return;
    }

    const payloadBase = {
      task: task.task,
      dueDate: task.dueDate,
      priority: task.priority || ("MEDIUM" as const),
      description: task.description || undefined,
      studentId: task.studentId || task.student_id || undefined,
    };

    if (assigneeIds.length === 1) {
      void toastAction(
        createTaskMutation.mutateAsync({
          ...payloadBase,
          assignedTo: assigneeIds[0],
        }),
        {
          loading: "Assigning task…",
          success: "Task assigned",
          error: "Failed to create task",
        },
      );
      return;
    }

    void toastAction(
      Promise.all(
        assigneeIds.map((assignedTo) =>
          createTaskMutation.mutateAsync({ ...payloadBase, assignedTo }),
        ),
      ),
      {
        loading: `Assigning to ${assigneeIds.length} people…`,
        success: `Assigned to ${assigneeIds.length} people`,
        error: "Failed to create tasks",
      },
    );
  };

  const handleUpdateTask = (task: StaffTask) => {
    const assignedTo = task.assignedTo || task.assigned_to;
    if (
      assignedTo === ASSIGN_SELF ||
      assignedTo === ASSIGN_ALL_MENTORS ||
      assignedTo === ASSIGN_ALL_MANAGERS
    ) {
      toast.error("Pick a specific person when editing a task");
      return;
    }

    void toastAction(
      updateTaskMutation.mutateAsync({
        id: task.id,
        updates: {
          task: task.task,
          description: task.description || undefined,
          dueDate: task.dueDate || task.due_date,
          priority: task.priority,
          assignedTo,
          status: task.status,
        },
      }),
      {
        loading: "Saving task…",
        success: "Task updated",
        error: "Failed to update task",
      },
    );
  };

  const handleUpdateTaskStatus = (
    taskId: string,
    status: "PENDING" | "COMPLETED" | "OVERDUE",
  ) => {
    void toastAction(updateTaskMutation.mutateAsync({ id: taskId, updates: { status } }), {
      loading: status === "COMPLETED" ? "Completing task…" : "Updating task…",
      success: status === "COMPLETED" ? "Task completed" : "Task reopened",
      error: "Failed to update status",
    });
  };

  const handleDeleteTask = (taskId: string) => {
    void toastAction(deleteTaskMutation.mutateAsync(taskId), {
      loading: "Deleting task…",
      success: "Task deleted",
      error: "Failed to delete task",
    });
  };

  return (
    <StaffTasksView
      role={role}
      currentUserId={user.id}
      currentUserName={user.name || user.email || undefined}
      tasks={tasks}
      mentors={mentors}
      assignees={assignees}
      onAddTask={handleAddTask}
      onUpdateTask={handleUpdateTask}
      onUpdateTaskStatus={handleUpdateTaskStatus}
      onDeleteTask={handleDeleteTask}
    />
  );
}
