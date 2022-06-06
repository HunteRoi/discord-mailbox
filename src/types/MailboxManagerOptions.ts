import { MessageOptions, TextChannel, VoiceChannel, Snowflake, EmojiIdentifierResolvable, MessageEmbedOptions, GuildTextBasedChannel } from "discord.js";
import { DateTime } from "luxon";

import { Ticket } from "./Ticket";
import { TicketContent } from "./TicketContent";

export type MailboxManagerOptions = {
    mailboxChannel: TextChannel | VoiceChannel | Snowflake;
    closeTicketAfterInMilliseconds: number;
    maxOnGoingTicketsPerUser: number;
    crontime: string | Date | DateTime;
};

export type MessageBasedMailboxManagerOptions = {
    loggingOptions?: LoggingOptions;
    threadOptions?: ThreadOptions;
    forceCloseEmoji?: EmojiIdentifierResolvable;
    replySentEmoji?: EmojiIdentifierResolvable;
    embedOptions?: MessageEmbedOptions;
    formatTitle: (ticket: Ticket) => string;
    replyMessage: string;
    deleteReplies?: boolean;
} & MailboxManagerOptions;

export type InteractionBasedMailboxManagerOptions = {} & MessageBasedMailboxManagerOptions;

export type LoggingOptions = {
    generateFileName(ticket: Ticket): string;
    generateMessage: (ticket: Ticket) => string | MessageOptions;
    generateLogEntry: (ticketContent: TicketContent) => string;
    showSenderNames: boolean;
    logChannel: GuildTextBasedChannel;
};

export type ThreadOptions = {
    name: (ticket: Ticket) => string;
    startMessage: (ticket: Ticket) => string | MessageOptions;
};