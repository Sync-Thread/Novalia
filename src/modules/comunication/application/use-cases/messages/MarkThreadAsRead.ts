import { Result } from "../../_shared/result";
import type { AuthService } from "../../ports/AuthService";
import type { ChatMessageRepo } from "../../ports/ChatMessageRepo";
import type { ChatThreadRepo } from "../../ports/ChatThreadRepo";
import { toDomainThread } from "../../mappers/chatThread.mapper";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MarkThreadAsRead {
  constructor(
    private readonly deps: {
      messageRepo: ChatMessageRepo;
      threadRepo: ChatThreadRepo;
      auth: AuthService;
    },
  ) {}

  async execute(threadId: string): Promise<Result<void>> {
    if (!UUID_REGEX.test(threadId)) {
      return Result.fail({ scope: "chat", code: "INVALID_THREAD_ID", message: "Identificador inválido" });
    }

    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }
    const auth = authResult.value;

    const threadResult = await this.deps.threadRepo.getById(threadId);
    if (threadResult.isErr()) {
      return Result.fail(threadResult.error);
    }
    const domainThread = toDomainThread(threadResult.value);

    const isUser = domainThread.participants.some(
      participant => participant.type === "user" && participant.id.toString() === auth.userId,
    );
    const isContact = domainThread.participants.some(
      participant => participant.type === "contact" && participant.id.toString() === (auth.contactId ?? ""),
    );

    if (!isUser && !isContact) {
      return Result.fail({ scope: "chat", code: "ACCESS_DENIED", message: "No tienes acceso al chat" });
    }

    const readerType: "user" | "contact" = isUser ? "user" : "contact";
    const readerId = readerType === "user" ? auth.userId : auth.contactId ?? null;

    if (!readerId) {
      return Result.fail({ scope: "chat", code: "READER_MISSING", message: "No se encontró el lector" });
    }

    const markResult = await this.deps.messageRepo.markThreadAsRead({
      threadId,
      readerType,
      readerId,
    });

    if (markResult.isErr()) {
      return Result.fail(markResult.error);
    }

    return Result.ok(undefined);
  }
}
