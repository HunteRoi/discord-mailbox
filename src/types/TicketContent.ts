import { Message } from "discord.js";

export type TicketContent = Pick<
    Message,
    | "attachments"
    | "author"
    | "cleanContent"
    | "content"
    | "createdAt"
    | "createdTimestamp"
    | "id"
    | "mentions"
    | "stickers"
    | "url"
    | "channel"
    | "embeds"
>;