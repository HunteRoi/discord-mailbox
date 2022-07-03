import { Client, Collection } from 'discord.js';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';

import ErrorMessages from './ErrorMessages';
import { MailboxManagerEvents } from './MailboxManagerEvents';
import { MailboxManagerOptions, IMailboxManager, Ticket, TicketContent, UserId, UserTickets } from './types';

export class MailboxManager extends EventEmitter implements IMailboxManager {
    protected readonly options: MailboxManagerOptions;
    readonly #cronJob: CronJob;

    public readonly client: Client;
    public readonly usersTickets: Collection<UserId, UserTickets>;

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
            context: this
        });
    }

    checkTickets(): void {
        this.usersTickets
            .flatMap((ut: UserTickets) => ut)
            .each(async (ticket: Ticket) => {
                if (ticket.isOutdated(this.options.closeTicketAfterInMilliseconds))
                    this.closeTicket(ticket.id);
            });
    }

    createTicket(content: TicketContent): Ticket {
        const ticket = new Ticket(content);

        const userTickets = this.usersTickets.get(ticket.createdBy.id) ?? new Collection<string, Ticket>();
        if (userTickets.size === this.options.maxOnGoingTicketsPerUser)
            throw new Error(ErrorMessages.tooMuchTicketsOpened);
        userTickets.set(ticket.id, ticket);
        this.usersTickets.set(ticket.createdBy.id, userTickets);

        this.emit(MailboxManagerEvents.ticketCreate, ticket);
        return ticket;
    }

    replyToTicket(content: TicketContent, ticketId: string): void {
        const ticket = this.getTicketById(ticketId);

        ticket.addMessage(content);
        this.emit(MailboxManagerEvents.ticketUpdate, ticket);
    }

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

    getTicketById(ticketId: string): Ticket {
        const ticket = this.usersTickets.flatMap((userTickets: UserTickets) => userTickets).find((t: Ticket) => t.id === ticketId);
        if (!ticket) throw new Error(ErrorMessages.noOpenedTicketWithId);
        return ticket;
    }

    getTicketByLastMessage(lastMessageId: string, safeReturn?: false): Ticket;
    getTicketByLastMessage(lastMessageId: string, safeReturn: true): Ticket | undefined;
    getTicketByLastMessage(lastMessageId: string, safeReturn: boolean = false): Ticket | undefined {
        const ticket = this.usersTickets.flatMap((userTickets: UserTickets) => userTickets).find((t: Ticket) => t.lastMessage.id === lastMessageId);
        if (!safeReturn && !ticket) throw new Error(ErrorMessages.messageHasNoTicket);
        return ticket;
    }
}