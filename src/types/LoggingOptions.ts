import {
  MessageOptions,
  GuildTextBasedChannel,
  Collection,
  GuildResolvable,
  Snowflake,
} from 'discord.js';
import { Ticket } from './Ticket';
import { TicketContent } from './TicketContent';

export type LoggingOptions = {
  /**
   * A function to generate a filename based on a provided ticket.
   *
   */
  generateFilename: (ticket: Ticket) => string;

  /**
   * A function to generate a message based on a provided ticket.
   *
   */
  generateMessage: (ticket: Ticket) => string | MessageOptions;

  /**
   * A function to generate a log entry based on a provided ticket's content.
   *
   */
  generateLogEntry: (ticketContent: TicketContent) => string;

  /**
   * Whether the sender names should be displayed or not.
   *
   * @type {boolean}
   */
  showSenderNames: boolean;

  /**
   * The channel in which the logs are sent.
   *
   * @type {Collection<Snowflake, GuildTextBasedChannel>}
   */
  channels: Collection<Snowflake, GuildTextBasedChannel>;

  /**
   * Whether the logs should be sent in the thread or not.
   *
   * @type {boolean}
   */
  sendInThread?: boolean;
};
