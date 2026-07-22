"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLorRequests } from "@/lib/hooks/useLor";
import LetterVaultView from "@/components/letters/LetterVaultView";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function StudentLetterVaultPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: requests = [], isLoading, refetch } = useLorRequests();

  if (isLoading) {
    return <FullPageSpinner label="Loading Letter Vault..." />;
  }

  const student = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }
    : { id: "", name: "", email: "" };

  return (
    <LetterVaultView
      student={student}
      requests={requests}
      onSendRequest={() => refetch()}
      onBack={() => router.push("/student/resources")}
      onRefresh={async () => {
        await refetch();
      }}
    />
  );
}
