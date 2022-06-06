import { Client, Collection, User } from 'discord.js';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';

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
            cronTime: this.options.crontime,
            onTick: () => this.checkTickets(),
            start: true,
            runOnInit: true,
            context: this
        });
    }

    checkTickets() {
        this.usersTickets.each((userTickets: UserTickets) => {
            userTickets.each((ticket: Ticket) => {
                if (ticket.isOutdated(this.options.closeTicketAfterInMilliseconds)) {
                    this.closeTicket(ticket.id);
                }
            });
        });
    }

    createTicket(content: TicketContent): Ticket {
        const ticket = new Ticket(content);

        const userTickets = this.usersTickets.get(ticket.createdBy.id) ?? new Collection<string, Ticket>();
        if (userTickets.size === this.options.maxOnGoingTicketsPerUser) {
            throw new Error('Too much tickets for this user');
        }
        userTickets.set(ticket.id, ticket);
        this.usersTickets.set(ticket.createdBy.id, userTickets);

        this.emit(MailboxManagerEvents.ticketCreate, ticket);
        return ticket;
    }

    replyToTicket(content: TicketContent, ticketId: string): void {
        const user: User = content.author;
        const userTickets = this.usersTickets.get(user.id);
        const ticket = userTickets?.get(ticketId);
        if (!ticket) throw new Error('Provided ticket ID does not exist for this user');

        ticket.addMessage(content);
        this.emit(MailboxManagerEvents.ticketUpdate, ticket);
    }

    closeTicket(ticketId: string): void {
        const userTickets = this.usersTickets.find((userTickets: UserTickets) => userTickets.has(ticketId));
        const ticket = userTickets?.get(ticketId);
        if (!ticket) throw new Error('Provided ticket ID does not exist for this user');

        ticket.close();
        this.emit(MailboxManagerEvents.ticketClose, ticket);

        userTickets.delete(ticket.id);
        if (userTickets.size === 0) this.usersTickets.delete(ticket.createdBy.id);

        this.emit(MailboxManagerEvents.ticketLog, ticket);
    }
}