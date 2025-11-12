import { Result } from "../../_shared/result";
import type { AuthService } from "../../ports/AuthService";
import type { ChatThreadRepo } from "../../ports/ChatThreadRepo";
import type { ChatThreadDTO } from "../../dto/ChatThreadDTO";

export type FindOrCreateThreadInput = {
  propertyId: string;
  orgId: string | null;
  listerUserId: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class FindOrCreateThread {
  private readonly deps: {
    threadRepo: ChatThreadRepo;
    auth: AuthService;
  };

  constructor(deps: {
    threadRepo: ChatThreadRepo;
    auth: AuthService;
  }) {
    this.deps = deps;
  }

  async execute(input: FindOrCreateThreadInput): Promise<Result<ChatThreadDTO>> {
    // Validate propertyId format
    if (!UUID_REGEX.test(input.propertyId)) {
      return Result.fail({
        scope: "chat",
        code: "INVALID_PROPERTY_ID",
        message: "El identificador de la propiedad es inválido",
      });
    }

    // Get current authenticated user
    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }
    const auth = authResult.value;

    if (!auth.userId) {
      return Result.fail({
        scope: "chat",
        code: "UNAUTHORIZED",
        message: "Debes estar autenticado para iniciar un chat",
      });
    }

    // Validate listerUserId if provided
    if (input.listerUserId && !UUID_REGEX.test(input.listerUserId)) {
      return Result.fail({
        scope: "chat",
        code: "INVALID_LISTER_ID",
        message: "El identificador del vendedor es inválido",
      });
    }

    // Check if thread already exists for this property + user
    const existingResult = await this.deps.threadRepo.findByPropertyAndUser({
      propertyId: input.propertyId,
      userId: auth.userId,
    });

    if (existingResult.isErr()) {
      return Result.fail(existingResult.error);
    }

    // If thread exists, return it
    if (existingResult.value) {
      return Result.ok(existingResult.value);
    }

    // Create new thread with current user and lister as participants
    const participantUserIds = [auth.userId];
    
    // Add lister if provided and different from current user
    if (input.listerUserId && input.listerUserId !== auth.userId) {
      participantUserIds.push(input.listerUserId);
    }

    // Use current user's org_id (not the lister's)
    // If current user is a buyer (no org), thread will have org_id = null
    // If current user is a seller/agent (has org), thread will belong to their org
    const createResult = await this.deps.threadRepo.create({
      orgId: auth.orgId ?? null,
      propertyId: input.propertyId,
      createdBy: auth.userId,
      participantUserIds,
    });

    if (createResult.isErr()) {
      return Result.fail(createResult.error);
    }

    return Result.ok(createResult.value);
  }
}
