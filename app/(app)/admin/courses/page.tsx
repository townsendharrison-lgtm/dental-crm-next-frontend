"use client";

import { Loader2 } from "lucide-react";
import AdminCoursesView from "@/components/admin/AdminCoursesView";
import { useCourses, useCourseSubmissions } from "@/lib/hooks/useCourses";

export default function AdminCoursesPage() {
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: submissions = [], isLoading: submissionsLoading } = useCourseSubmissions();

  if (coursesLoading || submissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return <AdminCoursesView courses={courses} submissions={submissions} />;
}
