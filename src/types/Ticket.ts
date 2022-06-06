import { Snowflake, User } from "discord.js";
import * as uuid from "uuid";

import { TicketContent } from "./TicketContent";

export class Ticket {
    readonly id: string;
    readonly createdBy: User;
    readonly createdAt: EpochTimeStamp;
    readonly messages: TicketContent[];

    #closedAt: EpochTimeStamp | null;
    #lastMessage: TicketContent;
    #channelId: Snowflake;

    get closedAt(): number | null {
        return this.#closedAt;
    }

    get lastMessage(): TicketContent {
        return this.#lastMessage;
    }

    get channelId(): Snowflake {
        return this.#channelId;
    }

    constructor(firstMessage: TicketContent) {
        this.id = uuid.v4();
        this.messages = [];
        this.createdBy = firstMessage.author;
        this.createdAt = firstMessage.createdTimestamp;

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