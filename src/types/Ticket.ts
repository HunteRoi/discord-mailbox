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

  #lastMessage!: TicketContent;
  #channelId: Snowflake | null;
  #guildId: Snowflake | null;
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
    return this.#channelId;
  }

  /**
   * Returns the guild of the ticket, if any.
   *
   * @readonly
   * @type {(Snowflake | null)}
   * @memberof Ticket
   */
  get guildId(): Snowflake | null {
    return this.#guildId;
  }

  /**
   * Creates an instance of Ticket.
   * @param {TicketContent} firstMessage
   * @memberof Ticket
   */
  constructor(firstMessage: TicketContent) {
    this.id = uuid.v4();
    this.messages = [];
    this.createdBy = firstMessage.author;
    this.createdAt = firstMessage.createdTimestamp;

    this.#closedAt = null;
    this.#channelId = null;
    this.#guildId = null;
    this.addMessage(firstMessage);
  }

  /**
   * Sets the ticket's channel.
   *
   * @param {Snowflake} channelId
   * @memberof Ticket
   */
  setChannel(channelId: Snowflake): void {
    this.#channelId = channelId;
  }

  /**
   * Sets the ticket's guild.
   *
   * @param {Snowflake} guildId
   * @memberof Ticket
   */
  setGuild(guildId: Snowflake): void {
    this.#guildId = guildId;
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
   * @return {*}  {boolean}
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
