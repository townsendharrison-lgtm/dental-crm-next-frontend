"use client";

import { useParams } from "next/navigation";
import { InboxPageShell } from "@/components/messages/InboxView";

export default function StudentConversationPage() {
  const params = useParams();
  const conversationId = String(params.conversationId || "");
  return <InboxPageShell variant="student" conversationId={conversationId} />;
}
