import { Result } from "../../_shared/result";
import type { Page } from "../../dto/PaginationDTO";
import { DEFAULT_PAGE_SIZE } from "../../dto/PaginationDTO";
import type { ChatMessageDTO } from "../../dto/ChatMessageDTO";
import type { ListMessagesInput } from "../../dto/ListMessagesDTO";
import type { AuthService } from "../../ports/AuthService";
import type { ChatMessageRepo } from "../../ports/ChatMessageRepo";
import type { ChatThreadRepo } from "../../ports/ChatThreadRepo";
import { toDomainThread } from "../../mappers/chatThread.mapper";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListMessages {
  constructor(
    private readonly deps: {
      messageRepo: ChatMessageRepo;
      threadRepo: ChatThreadRepo;
      auth: AuthService;
    },
  ) {}

  async execute(input: ListMessagesInput): Promise<Result<Page<ChatMessageDTO>>> {
    if (!UUID_REGEX.test(input.threadId)) {
      return Result.fail({ scope: "chat", code: "INVALID_THREAD_ID", message: "Identificador de chat inválido" });
    }

    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }
    const auth = authResult.value;

    const threadResult = await this.deps.threadRepo.getById(input.threadId);
    if (threadResult.isErr()) {
      return Result.fail(threadResult.error);
    }

    const domainThread = toDomainThread(threadResult.value);
    const isUserParticipant = domainThread.participants.some(
      participant => participant.type === "user" && participant.id.toString() === auth.userId,
    );
    const isContactParticipant = domainThread.participants.some(
      participant => participant.type === "contact" && participant.id.toString() === (auth.contactId ?? ""),
    );

    if (!isUserParticipant && !isContactParticipant) {
      return Result.fail({ scope: "chat", code: "ACCESS_DENIED", message: "No tienes acceso a este chat" });
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

    const repoResult = await this.deps.messageRepo.listByThread({
      threadId: input.threadId,
      page,
      pageSize,
    });

    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    return Result.ok(repoResult.value);
  }
}
