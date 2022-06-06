import { Collection, Snowflake } from "discord.js";

import { Ticket } from "./Ticket";
import { TicketContent } from "./TicketContent";

export type UserId = Snowflake;
export type UserTickets = Collection<string, Ticket>;

export interface IMailboxManager {
    readonly usersTickets: Collection<UserId, UserTickets>;

    createTicket(content: TicketContent): Ticket;

    replyToTicket(content: TicketContent, ticketId: string): void;

    closeTicket(ticketId: string): void;
}