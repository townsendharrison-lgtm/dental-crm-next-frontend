import { messagesApi } from "@/lib/api/messages";

/**
 * Find-or-create a DM with `userId`, then navigate to the conversation page.
 */
export async function openDmWithUser(
  userId: string,
  messagesBasePath: string,
  push: (href: string) => void,
) {
  const conv = await messagesApi.create({ participantIds: [userId] });
  push(`${messagesBasePath.replace(/\/$/, "")}/${conv.id}`);
  return conv;
}
