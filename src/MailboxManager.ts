import { EventEmitter } from "node:events";
import { CronJob } from "cron";
import { type Client, Collection, type Snowflake } from "discord.js";

import ErrorMessages from "./ErrorMessages.js";
import { MailboxManagerEvents } from "./MailboxManagerEvents.js";
import {
    type GlobalMailboxOptions,
    type IMailboxManager,
    Ticket,
    type TicketContent,
    type UserId,
    type UserTickets,
} from "./types/index.js";

/**
 * The base mailbox manager, handling tickets.
 *
 * @export
 * @class MailboxManager
 * @extends {EventEmitter}
 * @implements {IMailboxManager}
 */
export class MailboxManager extends EventEmitter implements IMailboxManager {
    readonly #managerOptions: GlobalMailboxOptions;
    readonly #cronJob: CronJob<null, this>; // eslint-disable-line no-unused-private-class-members

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
     * @param {GlobalMailboxOptions} options
     * @memberof MailboxManager
     */
    constructor(client: Client, options: GlobalMailboxOptions) {
        super();

        this.#managerOptions = options;
        this.client = client;
        this.usersTickets = new Collection<UserId, UserTickets>();
        this.#cronJob = CronJob.from({
            cronTime: this.#managerOptions.cronTime,
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
                if (
                    ticket.isOutdated(
                        this.#managerOptions.closeTicketAfterInMilliseconds,
                    )
                )
                    this.closeTicket(ticket.id);
            });
    }

    /** @inherit */
    createTicket(
        content: TicketContent,
        guildId: Snowflake,
        maxOnGoingTicketsPerUser?: number,
    ): Ticket {
        // biome-ignore lint: conditional assignment in case of undefined (also value is not constant due to manager's options)
        maxOnGoingTicketsPerUser ??=
            this.#managerOptions.maxOnGoingTicketsPerUser;
        const ticket = new Ticket(content, guildId);

        const userTickets =
            this.usersTickets.get(ticket.createdBy.id) ??
            new Collection<string, Ticket>();
        if (userTickets.size >= maxOnGoingTicketsPerUser)
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
        const userTickets = this.usersTickets.get(ticket.createdBy.id);
        if (!userTickets) return;

        let tickets: Ticket[] = [];
        ticket.close();
        userTickets.delete(ticket.id);
        if (userTickets.size === 0)
            this.usersTickets.delete(ticket.createdBy.id);
        else tickets = [...userTickets.values()];

        this.emit(MailboxManagerEvents.ticketClose, ticket, tickets);
        this.emit(MailboxManagerEvents.ticketLog, ticket);
    }

    /**
     * Gets a ticket by id.
     *
     * @param {string} ticketId
     * @return {Ticket}
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
     * @return {Ticket}
     * @memberof MailboxManager
     */
    getTicketByLastMessage(lastMessageId: string, safeReturn?: false): Ticket;
    getTicketByLastMessage(
        lastMessageId: string,
        safeReturn: true,
    ): Ticket | undefined;
    getTicketByLastMessage(
        lastMessageId: string,
        safeReturn = false,
    ): Ticket | undefined {
        const ticket = this.usersTickets
            .flatMap((userTickets: UserTickets) => userTickets)
            .find((t: Ticket) => t.lastMessage.id === lastMessageId);
        if (!safeReturn && !ticket)
            throw new Error(ErrorMessages.messageHasNoTicket);
        return ticket;
    }
}
