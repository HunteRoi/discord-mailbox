import { Message, Snowflake } from 'discord.js';

import { Ticket } from './Ticket';

/**
 *
 * @export
 * @interface LogsOptions
 */
export interface LogsOptions {
  /**
   * Whether to show the name of the person who replies or not.
   *
   * @type {boolean}
   * @memberof LogsOptions
   */
  showName: boolean;

  /**
   * Generate the file name.
   *
   */
  generateFilename: (ticket: Ticket) => string;

  /**
   * The format to print the message logged.
   *
   */
  format: (message: Message) => string;

  /**
   * The channel in which the logs should be sent.
   *
   * @type {Snowflake}
   */
  channel: Snowflake;

  /**
   * Whether the logs should be sent via DM to the recipient or not.
   *
   * @type {boolean}
   */
  sendToRecipient: boolean;

  /**
   * Generates the message to send with the file in the channel and optionally to the recipients.
   *
   */
  generateMessage: (ticket: Ticket) => string;
}
