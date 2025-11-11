import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../core/supabase/client";
import type { Clock } from "./application/ports/Clock";
import { systemClock } from "./domain/clock";
import {
  ListListerInbox,
  ListClientInbox,
  ListMessages,
  SendMessage,
  MarkThreadAsRead,
} from "./application";
import { SupabaseAuthService } from "./infrastructure/adapters/SupabaseAuthService";
import { SupabaseChatThreadRepo } from "./infrastructure/adapters/SupabaseChatThreadRepo";
import { SupabaseChatMessageRepo } from "./infrastructure/adapters/SupabaseChatMessageRepo";
import { SupabaseRealtimeChatService } from "./infrastructure/adapters/SupabaseRealtimeChatService";

export interface CommunicationContainerDeps {
  client?: SupabaseClient;
  clock?: Clock;
}

export interface CommunicationUseCases {
  listListerInbox: ListListerInbox;
  listClientInbox: ListClientInbox;
  listMessages: ListMessages;
  sendMessage: SendMessage;
  markThreadAsRead: MarkThreadAsRead;
}

export interface CommunicationRealtime {
  subscribeToThread: SupabaseRealtimeChatService["subscribeToThread"];
  unsubscribe: SupabaseRealtimeChatService["unsubscribe"];
  broadcastTyping: SupabaseRealtimeChatService["broadcastTyping"];
}

export interface CommunicationContainer {
  useCases: CommunicationUseCases;
  realtime: CommunicationRealtime;
}

export function createCommunicationContainer(deps: CommunicationContainerDeps = {}): CommunicationContainer {
  const client = deps.client ?? supabase;
  const clock = deps.clock ?? systemClock;

  const auth = new SupabaseAuthService(client);
  const threadRepo = new SupabaseChatThreadRepo(client);
  const messageRepo = new SupabaseChatMessageRepo(client);
  const realtimeService = new SupabaseRealtimeChatService(client);

  return {
    useCases: {
      listListerInbox: new ListListerInbox({ repo: threadRepo, auth }),
      listClientInbox: new ListClientInbox({ repo: threadRepo, auth }),
      listMessages: new ListMessages({ messageRepo, threadRepo, auth }),
      sendMessage: new SendMessage({ messageRepo, threadRepo, auth, clock }),
      markThreadAsRead: new MarkThreadAsRead({ messageRepo, threadRepo, auth }),
    },
    realtime: {
      subscribeToThread: realtimeService.subscribeToThread.bind(realtimeService),
      unsubscribe: realtimeService.unsubscribe.bind(realtimeService),
      broadcastTyping: realtimeService.broadcastTyping.bind(realtimeService),
    },
  };
}
