import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { SendMessageInput, SendMessageResult } from "../../dto/SendMessageDTO";
import { MessageBody } from "../../../domain/value-objects/MessageBody";
import type { AuthService } from "../../ports/AuthService";
import type { ChatMessageRepo } from "../../ports/ChatMessageRepo";
import type { ChatThreadRepo } from "../../ports/ChatThreadRepo";
import type { Clock } from "../../ports/Clock";
import { toDomainThread } from "../../mappers/chatThread.mapper";
import { toDomainMessage, fromDomainMessage } from "../../mappers/chatMessage.mapper";
import { sendMessageSchema } from "../../validators/message.schema";
import type { SenderType } from "../../../domain/enums";

export class SendMessage {
  constructor(
    private readonly deps: {
      messageRepo: ChatMessageRepo;
      threadRepo: ChatThreadRepo;
      auth: AuthService;
      clock: Clock;
    },
  ) {}

  async execute(rawInput: SendMessageInput): Promise<Result<SendMessageResult>> {
    const parseResult = parseWith(sendMessageSchema, rawInput);
    if (parseResult.isErr()) {
      return Result.fail(parseResult.error);
    }

    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }
    const auth = authResult.value;

    const threadResult = await this.deps.threadRepo.getById(rawInput.threadId);
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
      return Result.fail({ scope: "chat", code: "ACCESS_DENIED", message: "No puedes enviar mensajes en este chat" });
    }

    const senderType: SenderType = isUser ? "user" : "contact";
    const senderId = senderType === "user" ? auth.userId : auth.contactId ?? null;

    if (!senderId) {
      return Result.fail({
        scope: "chat",
        code: "SENDER_MISSING",
        message: "No se encontró el identificador del remitente",
      });
    }

    const body = MessageBody.create(rawInput.body);

    const messageResult = await this.deps.messageRepo.create({
      threadId: rawInput.threadId,
      senderType,
      senderId,
      body: body.toString(),
      payload: rawInput.payload ?? null,
    });

    if (messageResult.isErr()) {
      return Result.fail(messageResult.error);
    }

    await this.deps.threadRepo.touchLastMessageAt(rawInput.threadId, messageResult.value.createdAt ?? this.deps.clock.now().toISOString());

    const domainMessage = toDomainMessage(messageResult.value, { clock: this.deps.clock });
    return Result.ok(fromDomainMessage(domainMessage));
  }
}
