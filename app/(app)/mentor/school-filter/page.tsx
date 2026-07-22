"use client";

import SchoolFilterView from "@/components/student/SchoolFilterView";

export default function MentorSchoolFilterPage() {
  return (
    <div className="pt-6">
      <SchoolFilterView isMentorView={true} />
    </div>
  );
}
