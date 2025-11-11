export const SENDER_TYPE = {
  User: "user",
  Contact: "contact",
  System: "system",
} as const;
export type SenderType = typeof SENDER_TYPE[keyof typeof SENDER_TYPE];

export const PARTICIPANT_TYPE = {
  User: "user",
  Contact: "contact",
} as const;
export type ParticipantType = typeof PARTICIPANT_TYPE[keyof typeof PARTICIPANT_TYPE];

export const MESSAGE_STATUS = {
  Sent: "sent",
  Delivered: "delivered",
  Read: "read",
} as const;
export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];

export const THREAD_AUDIENCE = {
  Lister: "lister",
  Client: "client",
} as const;
export type ThreadAudience = typeof THREAD_AUDIENCE[keyof typeof THREAD_AUDIENCE];

export const THREAD_STATUS = {
  Open: "open",
  Archived: "archived",
} as const;
export type ThreadStatus = typeof THREAD_STATUS[keyof typeof THREAD_STATUS];

export type CurrencyCode = "MXN" | "USD";
