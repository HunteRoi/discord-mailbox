import { MailboxManager } from '..';
import { Ticket } from '../types';

export const handleClosing = async (manager : MailboxManager, ticket: Ticket) => {
  ticket.closedAt = Date.now();

  const userTickets = manager.userTickets.get(ticket.createdBy);
  if (userTickets) {
    userTickets.delete(ticket.id);
    if (userTickets.size === 0) manager.userTickets.delete(ticket.createdBy);

    manager.emit('ticketDelete', ticket);
    manager.emit('ticketLog', ticket);
  }
};
