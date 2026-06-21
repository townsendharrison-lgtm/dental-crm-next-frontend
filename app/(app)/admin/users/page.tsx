"use client";

import dynamic from "next/dynamic";
import { FullPageSpinner } from "@/components/ui/Spinner";

const UserManagement = dynamic(() => import("@/components/admin/UserManagement"), {
  ssr: false,
  loading: () => <FullPageSpinner label="Loading…" />,
});

export default function AdminUsersPage() {
  return <UserManagement />;
}
