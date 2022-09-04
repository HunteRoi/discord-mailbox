import { EmojiIdentifierResolvable, EmbedData, Guild } from 'discord.js';
import { LoggingOptions } from './LoggingOptions';
import { ThreadOptions } from './ThreadOptions';
import { Ticket } from './Ticket';
import { MailboxManagerOptions } from './MailboxManagerOptions';

export type MessageBasedMailboxManagerOptions = {
  /**
   * The logging options
   *
   * @type {LoggingOptions}
   */
  loggingOptions?: LoggingOptions;

  /**
   * The thread options
   *
   * @type {ThreadOptions}
   */
  threadOptions?: ThreadOptions;

  /**
   * The embed options
   *
   * @type {EmbedData}
   */
  embedOptions?: EmbedData;

  /**
   * The emoji used in reaction and in button to force close a ticket.
   *
   * @type {string}
   */
  forceCloseEmoji?: string;

  /**
   * The emoji used in reaction to show the admins a ticket has received an answer.
   *
   * @type {EmojiIdentifierResolvable}
   */
  replySentEmoji?: EmojiIdentifierResolvable;

  /**
   * A function to build a ticket's title from the ticket object itself.
   *
   */
  formatTitle: (ticket: Ticket, guild: Guild) => string;

  /**
   * The reply message
   *
   * @type {string}
   */
  replyMessage: string;

  /**
   * The prefix for threads used when a ticket is closed.
   *
   * @type {string}
   */
  closedChannelPrefix?: string;

  /**
   * The message sent to a user when they have too much ongoing tickets.
   *
   * @type {string}
   */
  tooMuchTickets?: string;
} & MailboxManagerOptions;
