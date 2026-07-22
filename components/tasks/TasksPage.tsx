"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRole } from "@/lib/hooks/useRole";
import { useMentors } from "@/lib/hooks/useMentors";
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/hooks/useTasks";
import StaffTasksView from "@/components/tasks/StaffTasksView";
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
    if (!isAdmin) return mentors;
    return allUsers.filter((u) => u.role === "MENTOR" || u.role === "MENTOR_MANAGER");
  }, [isAdmin, allUsers, mentors]);

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
    void toastAction(
      createTaskMutation.mutateAsync({
        assignedTo: task.assignedTo,
        task: task.task,
        dueDate: task.dueDate,
        priority: task.priority || "MEDIUM",
        description: task.description || undefined,
        studentId: task.studentId || task.student_id || undefined,
      }),
      {
        loading: "Assigning task…",
        success: "Task assigned",
        error: "Failed to create task",
      },
    );
  };

  const handleUpdateTask = (task: StaffTask) => {
    void toastAction(
      updateTaskMutation.mutateAsync({
        id: task.id,
        updates: {
          task: task.task,
          description: task.description || undefined,
          dueDate: task.dueDate || task.due_date,
          priority: task.priority,
          assignedTo: task.assignedTo || task.assigned_to,
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
