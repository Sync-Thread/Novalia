export type ChatParticipantDTO = {
  id: string;
  type: "user" | "contact";
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  lastSeenAt: string | null;
};
