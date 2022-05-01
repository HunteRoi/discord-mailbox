import { EmojiResolvable, Snowflake } from 'discord.js';
import { Moment } from 'moment';

import { EmbedOptions } from './EmbedOptions';
import { LogsOptions } from './LogsOptions';
import { ThreadOptions } from './ThreadOptions';

/**
 * The mailbox manager options.
 *
 * @export
 * @interface MailboxManagerOptions
 */
export interface MailboxManagerOptions {
  /**
   * A method to generate the message to return to the user when their ticket is closed.
   *
   * @type {string}
   */
  ticketClose: (numberOfTickets: number) => string;

  /**
   * The message to return when a user has too much not-closed tickets and is trying to create a new one.
   *
   * @type {string}
   */
  tooMuchTickets: string;

  /**
   * The message to return when a ticket message contains @everyone or @here
   *
   * @type {string}
   */
  notAllowedToPing: string;

  /**
   * The text under each embed that says "reply to continue messaging with this ticket".
   *
   * @type {string}
   */
  replyMessage: string;

  /**
   * The text message sent to the user opening a new ticket.
   *
   * @type {string}
   */
  autoReplyMessage?: string;

  /**
   * The maximum of possibly not-closed tickets per user.
   *
   * @type {number}
   */
  maxOngoingTicketsPerUser: number;

  /**
   * The channel in which the tickets' messages are sent.
   *
   * @type {Snowflake}
   */
  mailboxChannel: Snowflake;

  /**
   * The thread options. If set, threads are used with the {@link mailboxChannel} as parent.
   *
   * @type {ThreadOptions}
   */
  threadOptions?: ThreadOptions;

  /**
   * Whether the replies in the mailbox channel should get deleted or not.
   *
   * @type {boolean}
   */
  deleteReplies?: boolean;

  /**
   * Seconds after which, if no interaction for a ticket, should it be closed.
   *
   * @type {number}
   */
  closeTicketAfter: number;

  /**
   * Format of the ticket title. The ticket id must be present in the returned string.
   *
   * @required
   */
  formatTitle: (ticketId: string) => string;

  /**
   * The scheduled time where all tickets are verified for time out.
   *
   * @type {(string | Date)}
   * @see {cron} https://www.npmjs.com/package/cron
   */
  cronTime: string | Date | Moment;

  /**
   * The emoji added to mails to trigger the force close.
   *
   * @type {EmojiResolvable}
   */
  forceCloseEmoji?: EmojiResolvable;

  /**
   * The emoji to add as reaction to a ticket when a reply has been sent already.
   *
   * @type {EmojiResolvable}
   */
  replySentEmoji?: EmojiResolvable;

  /**
   * The logging options.
   *
   * @type {LogsOptions}
   */
  loggingOptions?: LogsOptions;

  /**
   * The embed options.
   *
   * @type {EmbedOptions}
   */
  embedOptions?: EmbedOptions;
}
