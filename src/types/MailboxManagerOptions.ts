import { MessageOptions, TextChannel, VoiceChannel, Snowflake, EmojiIdentifierResolvable, MessageEmbedOptions, GuildTextBasedChannel, RoleResolvable } from "discord.js";
import { DateTime } from "luxon";

import { Ticket } from "./Ticket";
import { TicketContent } from "./TicketContent";

export type MailboxManagerOptions = {
    mailboxChannel: TextChannel | VoiceChannel | Snowflake;
    closeTicketAfterInMilliseconds: number;
    maxOnGoingTicketsPerUser: number;
    cronTime: string | Date | DateTime;
};

export type MessageBasedMailboxManagerOptions = {
    loggingOptions?: LoggingOptions;
    threadOptions?: ThreadOptions;
    embedOptions?: MessageEmbedOptions;
    forceCloseEmoji?: EmojiIdentifierResolvable;
    replySentEmoji?: EmojiIdentifierResolvable;
    formatTitle: (ticket: Ticket) => string;
    replyMessage: string;
    closedChannelPrefix?: string;
    tooMuchTickets?: string;
} & MailboxManagerOptions;

export type InteractionBasedMailboxManagerOptions = {} & MessageBasedMailboxManagerOptions;

export type LoggingOptions = {
    generateFilename: (ticket: Ticket) => string;
    generateMessage: (ticket: Ticket) => string | MessageOptions;
    generateLogEntry: (ticketContent: TicketContent) => string;
    showSenderNames: boolean;
    /**
     * @deprecated will be removed in next minor update.
     * Users have the right to have a copy of the conversation.
     *
     * @type {boolean | undefined}
     */
    sendToRecipient?: boolean;
    channel: GuildTextBasedChannel;
};

export type ThreadOptions = {
    name: (ticket: Ticket) => string;
    startMessage: (ticket: Ticket) => string | MessageOptions;
};