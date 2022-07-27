import { Client, Collection } from 'discord.js';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';

import ErrorMessages from './ErrorMessages';
import { MailboxManagerEvents } from './MailboxManagerEvents';
import {
  MailboxManagerOptions,
  IMailboxManager,
  Ticket,
  TicketContent,
  UserId,
  UserTickets,
} from './types';

/**
 * The base mailbox manager, handling tickets.
 *
 * @export
 * @class MailboxManager
 * @extends {EventEmitter}
 * @implements {IMailboxManager}
 */
export class MailboxManager extends EventEmitter implements IMailboxManager {
  /**
   * The mailbox options.
   *
   * @protected
   * @type {MailboxManagerOptions}
   * @memberof MailboxManager
   */
  protected readonly options: MailboxManagerOptions;
  readonly #cronJob: CronJob;

  /**
   * The discord client
   *
   * @memberof MailboxManager
   */
  public readonly client: Client;

  /** @inherit */
  public readonly usersTickets: Collection<UserId, UserTickets>;

  /**
   * Creates an instance of MailboxManager.
   * @param {Client} client
   * @param {MailboxManagerOptions} options
   * @memberof MailboxManager
   */
  constructor(client: Client, options: MailboxManagerOptions) {
    super();

    this.options = options;
    this.client = client;
    this.usersTickets = new Collection<UserId, UserTickets>();
    this.#cronJob = new CronJob({
      cronTime: this.options.cronTime,
      onTick: () => this.checkTickets(),
      start: true,
      runOnInit: true,
      context: this,
    });
  }

  /** @inherit */
  checkTickets(): void {
    this.usersTickets
      .flatMap((ut: UserTickets) => ut)
      .each(async (ticket: Ticket) => {
        if (ticket.isOutdated(this.options.closeTicketAfterInMilliseconds))
          this.closeTicket(ticket.id);
      });
  }

  /** @inherit */
  createTicket(content: TicketContent): Ticket {
    const ticket = new Ticket(content);

    const userTickets =
      this.usersTickets.get(ticket.createdBy.id) ??
      new Collection<string, Ticket>();
    if (userTickets.size === this.options.maxOnGoingTicketsPerUser)
      throw new Error(ErrorMessages.tooMuchTicketsOpened);
    userTickets.set(ticket.id, ticket);
    this.usersTickets.set(ticket.createdBy.id, userTickets);

    this.emit(MailboxManagerEvents.ticketCreate, ticket);
    return ticket;
  }

  /** @inherit */
  replyToTicket(content: TicketContent, ticketId: string): void {
    const ticket = this.getTicketById(ticketId);

    ticket.addMessage(content);
    this.emit(MailboxManagerEvents.ticketUpdate, ticket);
  }

  /** @inherit */
  closeTicket(ticketId: string): void {
    const ticket = this.getTicketById(ticketId);
    const userTickets = this.usersTickets.get(ticket.createdBy.id)!;

    let tickets: Ticket[] = [];
    ticket.close();
    userTickets.delete(ticket.id);
    if (userTickets.size === 0) this.usersTickets.delete(ticket.createdBy.id);
    else tickets = [...userTickets.values()];

    this.emit(MailboxManagerEvents.ticketClose, ticket, tickets);
    this.emit(MailboxManagerEvents.ticketLog, ticket);
  }

  /**
   * Gets a ticket by id.
   *
   * @param {string} ticketId
   * @return {*}  {Ticket}
   * @memberof MailboxManager
   */
  getTicketById(ticketId: string): Ticket {
    const ticket = this.usersTickets
      .flatMap((userTickets: UserTickets) => userTickets)
      .find((t: Ticket) => t.id === ticketId);
    if (!ticket) throw new Error(ErrorMessages.noOpenedTicketWithId);
    return ticket;
  }

  /**
   * Gets a ticket by last message id. If safeReturn is false and no ticket is found, throws an error.
   *
   * @param {string} lastMessageId
   * @param {false} [safeReturn]
   * @return {*}  {Ticket}
   * @memberof MailboxManager
   */
  getTicketByLastMessage(lastMessageId: string, safeReturn?: false): Ticket;
  getTicketByLastMessage(
    lastMessageId: string,
    safeReturn: true
  ): Ticket | undefined;
  getTicketByLastMessage(
    lastMessageId: string,
    safeReturn: boolean = false
  ): Ticket | undefined {
    const ticket = this.usersTickets
      .flatMap((userTickets: UserTickets) => userTickets)
      .find((t: Ticket) => t.lastMessage.id === lastMessageId);
    if (!safeReturn && !ticket)
      throw new Error(ErrorMessages.messageHasNoTicket);
    return ticket;
  }
}
