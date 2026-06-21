"use client";

import { useRouter } from "next/navigation";
import FindDentistView from "@/components/dentists/FindDentistView";

export default function StudentFindDentistPage() {
  const router = useRouter();

  return (
    <FindDentistView
      onBack={() => router.push("/resources")}
      onBackText="Back to Resources"
      hideHeaderOnDesktop={true}
    />
  );
}
