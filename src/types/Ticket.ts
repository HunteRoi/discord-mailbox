import { Collection, Message, Snowflake } from 'discord.js';

/**
 *
 * @export
 * @interface Ticket
 */
export interface Ticket {
  /**
   * The identifier of the ticket.
   *
   * @type {string}
   */
  id: string;

  /**
   * The messages related to that ticket.
   *
   * @type {Collection<Snowflake, Message>}
   */
  messages: Collection<Snowflake, Message>;
  
  /**
   * The generated logs for that ticket.
   *
   * @type {Array<string>}
   */
  logs: Array<string>;

  /**
   * The time in milliseconds at which the last message of the ticket has been sent.
   *
   * @type {number}
   */
  lastMessageAt: number;
  
  /**
   * The identifier of the user who initiated the ticket.
   *
   * @type {Snowflake}
   */
  createdBy: Snowflake;
  
  /**
   * The time in milliseconds at which the ticket was created.
   *
   * @type {number}
   */
  createdAt: number;
  
  /**
   * The time in milliseconds at which the ticket was closed.
   *
   * @type {number}
   */
  closedAt?: number;
}
