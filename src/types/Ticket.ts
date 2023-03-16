import { Snowflake, User } from 'discord.js';
import * as uuid from 'uuid';

import { TicketContent } from './TicketContent';

/**
 * A ticket entity.
 *
 * @export
 * @class Ticket
 */
export class Ticket {
  /**
   * The id of the ticket.
   *
   * @type {string}
   * @memberof Ticket
   */
  readonly id: string;

  /**
   * The author of the ticket.
   *
   * @type {User}
   * @memberof Ticket
   */
  readonly createdBy: User;

  /**
   * The creation date of the ticket.
   *
   * @type {EpochTimeStamp}
   * @memberof Ticket
   */
  readonly createdAt: EpochTimeStamp;

  /**
   * The different messages involved in the ticket.
   *
   * @type {TicketContent[]}
   * @memberof Ticket
   */
  readonly messages: TicketContent[];

  /**
   * The guild in which the ticket has been created.
   *
   * @memberof Ticket
   */
  readonly guildId: Snowflake;

  #threadId: Snowflake | null;
  #lastMessage!: TicketContent;
  #closedAt: EpochTimeStamp | null;

  /**
   * Returns a datetime of when the ticket should get closed.
   *
   * @readonly
   * @type {(number | null)}
   * @memberof Ticket
   */
  get closedAt(): number | null {
    return this.#closedAt;
  }

  /**
   * Returns the last message of the ticket.
   *
   * @readonly
   * @type {TicketContent}
   * @memberof Ticket
   */
  get lastMessage(): TicketContent {
    return this.#lastMessage;
  }

  /**
   * Returns the thread of the ticket, if any.
   *
   * @readonly
   * @type {(Snowflake | null)}
   * @memberof Ticket
   */
  get threadId(): Snowflake | null {
    return this.#threadId;
  }

  /**
   * Creates an instance of Ticket.
   * @param {TicketContent} firstMessage
   * @memberof Ticket
   */
  constructor(firstMessage: TicketContent, guildId: Snowflake) {
    this.id = uuid.v4();
    this.messages = [];
    this.createdBy = firstMessage.author;
    this.createdAt = firstMessage.createdTimestamp;
    this.guildId = guildId;

    this.#threadId = null;
    this.#closedAt = null;
    this.addMessage(firstMessage);
  }

  /**
   * Sets the ticket's thread channel.
   *
   * @param {Snowflake} threadId
   * @memberof Ticket
   */
  setThreadChannel(threadId: Snowflake): void {
    this.#threadId = threadId;
  }

  /**
   * Adds a message to the ticket.
   *
   * @param {TicketContent} message
   * @memberof Ticket
   */
  addMessage(message: TicketContent): void {
    this.messages.push(message);
    this.#lastMessage = message;
  }

  /**
   * Checks if the ticket is outdated or not.
   *
   * @param {number} closeAfterInMilliseconds
   * @return {boolean}
   * @memberof Ticket
   */
  isOutdated(closeAfterInMilliseconds: number): boolean {
    return (
      Date.now() - this.#lastMessage.createdTimestamp >=
      closeAfterInMilliseconds
    );
  }

  /**
   * Closes the ticket.
   *
   * @memberof Ticket
   */
  close() {
    this.#closedAt = Date.now();
  }
}
