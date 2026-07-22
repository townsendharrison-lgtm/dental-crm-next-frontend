"use client";

import { useParams } from "next/navigation";
import { InboxPageShell } from "@/components/messages/InboxView";

export default function MentorConversationPage() {
  const params = useParams();
  const conversationId = String(params.conversationId || "");
  return <InboxPageShell variant="mentor" conversationId={conversationId} />;
}
