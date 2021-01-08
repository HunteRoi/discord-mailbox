import { MailboxManager } from '..';
import { Ticket } from '../types';

export const handleClosing = async (manager : MailboxManager, ticket: Ticket) => {
  ticket.closedAt = Date.now();

  manager.tickets.delete(ticket.createdBy);
  manager.emit('ticketDelete', ticket);

  if (!manager.options.loggingOptions) return;

  // handle logging here
  
};
