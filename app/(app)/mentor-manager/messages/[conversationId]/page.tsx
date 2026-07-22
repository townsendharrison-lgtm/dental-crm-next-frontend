"use client";

import { useParams } from "next/navigation";
import { InboxPageShell } from "@/components/messages/InboxView";

export default function MentorManagerConversationPage() {
  const params = useParams();
  const conversationId = String(params.conversationId || "");
  return <InboxPageShell variant="admin" conversationId={conversationId} />;
}
