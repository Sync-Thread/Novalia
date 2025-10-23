// src/modules/properties/properties.container.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../core/supabase/client";
import type { Clock } from "./application/ports/Clock";
import {
  ListProperties,
  GetProperty,
  CreateProperty,
  UpdateProperty,
  PublishProperty,
  PauseProperty,
  SchedulePublish,
  MarkSold,
  DeleteProperty,
  UploadMedia,
  RemoveMedia,
  SetCoverMedia,
  ReorderMedia,
  AttachDocument,
  VerifyRpp,
  ListPropertyDocuments,
  DeleteDocument as DeleteDocumentUseCase,
  GetAuthProfile,
} from "./application";
import { SupabaseAuthService } from "./infrastructure/adapters/SupabaseAuthService";
import { SupabasePropertyRepo } from "./infrastructure/adapters/SupabasePropertyRepo";
import { SupabaseDocumentRepo } from "./infrastructure/adapters/SupabaseDocumentRepo";
import { SupabaseMediaStorage } from "./infrastructure/adapters/SupabaseMediaStorage";

export interface PropertiesContainerDeps {
  client?: SupabaseClient;
  clock?: Clock;
  env?: string;
}

export interface PropertiesUseCases {
  listProperties: ListProperties;
  getProperty: GetProperty;
  createProperty: CreateProperty;
  updateProperty: UpdateProperty;
  publishProperty: PublishProperty;
  pauseProperty: PauseProperty;
  schedulePublish: SchedulePublish;
  markSold: MarkSold;
  deleteProperty: DeleteProperty;
  uploadMedia: UploadMedia;
  removeMedia: RemoveMedia;
  setCoverMedia: SetCoverMedia;
  reorderMedia: ReorderMedia;
  attachDocument: AttachDocument;
  verifyRpp: VerifyRpp;
  listDocuments: ListPropertyDocuments;
  deleteDocument: DeleteDocumentUseCase;
  getAuthProfile: GetAuthProfile;
}

export interface PropertiesContainer {
  useCases: PropertiesUseCases;
}

const defaultClock: Clock = {
  now: () => new Date(),
};

export function createPropertiesContainer(deps: PropertiesContainerDeps = {}): PropertiesContainer {
  const client = deps.client ?? supabase;
  const clock = deps.clock ?? defaultClock;

  const auth = new SupabaseAuthService({ client });
  const propertyRepo = new SupabasePropertyRepo({ client, auth, clock });
  const documentRepo = new SupabaseDocumentRepo({ client, auth });
  const mediaStorage = new SupabaseMediaStorage({ supabase: client, authService: auth });

  return {
    useCases: {
      listProperties: new ListProperties({ repo: propertyRepo, clock }),
      getProperty: new GetProperty({ repo: propertyRepo, clock }),
      createProperty: new CreateProperty({ repo: propertyRepo, auth, clock }),
      updateProperty: new UpdateProperty({ repo: propertyRepo, media: mediaStorage, documents: documentRepo, clock }),
      publishProperty: new PublishProperty({ repo: propertyRepo, auth, clock }),
      pauseProperty: new PauseProperty({ repo: propertyRepo, clock }),
      schedulePublish: new SchedulePublish({ repo: propertyRepo, clock }),
      markSold: new MarkSold({ repo: propertyRepo, clock }),
      deleteProperty: new DeleteProperty({ repo: propertyRepo, clock }),
      uploadMedia: new UploadMedia({ media: mediaStorage, properties: propertyRepo }),
      removeMedia: new RemoveMedia({ media: mediaStorage }),
      setCoverMedia: new SetCoverMedia({ media: mediaStorage }),
      reorderMedia: new ReorderMedia({ media: mediaStorage }),
      attachDocument: new AttachDocument({ documents: documentRepo, properties: propertyRepo }),
      verifyRpp: new VerifyRpp({ documents: documentRepo, properties: propertyRepo, clock }),
      listDocuments: new ListPropertyDocuments({ documents: documentRepo }),
      deleteDocument: new DeleteDocumentUseCase({ documents: documentRepo }),
      getAuthProfile: new GetAuthProfile({ auth }),
    },
  };
}
