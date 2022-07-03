import { Snowflake, User } from "discord.js";
import * as uuid from "uuid";

import { TicketContent } from "./TicketContent";

export class Ticket {
    readonly id: string;
    readonly createdBy: User;
    readonly createdAt: EpochTimeStamp;
    readonly messages: TicketContent[];

    #lastMessage!: TicketContent;
    #channelId: Snowflake | null;
    #closedAt: EpochTimeStamp | null;

    get closedAt(): number | null {
        return this.#closedAt;
    }

    get lastMessage(): TicketContent {
        return this.#lastMessage;
    }

    get threadId(): Snowflake | null {
        return this.#channelId;
    }

    constructor(firstMessage: TicketContent) {
        this.id = uuid.v4();
        this.messages = [];
        this.createdBy = firstMessage.author;
        this.createdAt = firstMessage.createdTimestamp;

        this.#closedAt = null;
        this.#channelId = null;
        this.addMessage(firstMessage);
    }

    setChannel(channelId: Snowflake): void {
        this.#channelId = channelId;
    }

    addMessage(message: TicketContent): void {
        this.messages.push(message);
        this.#lastMessage = message;
    }

    isOutdated(closeAfterInMilliseconds: number): boolean {
        return Date.now() - this.#lastMessage.createdTimestamp >= closeAfterInMilliseconds;
    }

    close() {
        this.#closedAt = Date.now();
    }
}