import { Guild, Snowflake, ThreadChannel, User } from 'discord.js';
import { Ticket } from './Ticket';
import { EmbedOptions } from './EmbedOptions';
import { InteractionOptions } from './InteractionOptions';
import { LoggingOptions } from './LoggingOptions';
import { ModalOptions } from './ModalOptions';
import { ThreadOptions } from './ThreadOptions';

export type PerGuildMailboxOptions = {
    /**
     * The settings for the modal forms.
     *
     * @type {ModalOptions}
     */
    modalOptions: ModalOptions;

    /**
     * The logging options. Do not provide if you do not want to log.
     *
     * @type {LoggingOptions}
     */
    loggingOptions?: LoggingOptions;

    /**
     * The thread options. Do not provide if you do not want to use threads.
     *
     * @type {ThreadOptions}
     */
    threadOptions?: ThreadOptions;

    /**
     * The embed options. Do not provide if you do not want to use embeds.
     *
     * @type {EmbedData}
     */
    embedOptions?: EmbedOptions;

    /**
     * The mailbox channel in which the content is sent (or from which the threads are created).
     *
     * @type {Snowflake}
     */
    mailboxChannel: Snowflake;

    /**
     * The maximum number of ongoing tickets per user for this guild.
     *
     * @type {number}
     */
    maxOnGoingTicketsPerUser: number;

    /**
     * A function to build the reply message.
     *
     */
    generateReplyMessage: (ticket: Ticket, guild: Guild) => string;

    /**
     * A function to build a ticket's title from the ticket object itself.
     *
     */
    generateMessageTitle: (ticket: Ticket, guild: Guild) => string;

    /**
     * A function to build the ticket's channel name when the ticket is closed.
     *
     */
    generateClosedChannelName: (ticket: Ticket, guild: Guild, thread?: ThreadChannel) => string;

    /**
     * A function to build the message sent to a user when they have too much ongoing tickets.
     */
    generateTooMuchTicketsMessage: (user: User, guild: Guild) => string;
} & InteractionOptions;
