import { Message, Snowflake } from 'discord.js';
export type LogTypes = 'html' | 'txt';

/**
 *
 * @export
 * @interface LogsOptions
 */
export interface LogsOptions {

  /**
   * The format to print the message logged.
   *
   */
  format: (message: Message) => string;

  /**
   * The type of the logs.
   *
   * @type {LogTypes}
   */
  type: LogTypes;

  /**
   * The channel in which the logs should be sent.
   *
   * @type {Snowflake}
   */
  channel?: Snowflake;

  /**
   * Whether the logs should be sent via DM to the recipient or not.
   *
   * @type {boolean}
   */
  sendToRecipient: boolean;
}
