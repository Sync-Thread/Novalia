export type ChatParticipantDTO = {
  id: string;
  type: "user" | "contact";
  displayName: string | null;
  email: string | null;
  phone: string | null;
  lastSeenAt: string | null;
};
