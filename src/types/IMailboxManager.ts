import { Collection, Snowflake } from 'discord.js';

import { Ticket } from './Ticket';
import { TicketContent } from './TicketContent';

export type UserId = Snowflake;
export type UserTickets = Collection<string, Ticket>;

export interface IMailboxManager {
  /**
   * The opened tickets per users collection.
   *
   * @type {Collection<UserId, UserTickets>}
   * @memberof MailboxManager
   */
  readonly usersTickets: Collection<UserId, UserTickets>;

  /**
   * Creates a ticket based on the provided content.
   *
   * @param {TicketContent} content
   * @param {Snowflake} guildId
   * @param {number?} maxOnGoingTicketsPerUser
   * @return {Ticket}
   * @memberof IMailboxManager
   */
  createTicket(content: TicketContent, guildId: Snowflake, maxOnGoingTicketsPerUser?: number): Ticket;

  /**
   * Replies to a ticket with a provided content.
   *
   * @param {TicketContent} content
   * @param {string} ticketId
   * @memberof IMailboxManager
   */
  replyToTicket(content: TicketContent, ticketId: string): void;

  /**
   * Closes the provided ticket.
   *
   * @param {string} ticketId
   * @memberof IMailboxManager
   */
  closeTicket(ticketId: string): void;

  /**
   * Checks whether the tickets are outdated.
   *
   * @memberof MailboxManager
   */
  checkTickets(): void;
}
