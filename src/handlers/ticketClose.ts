import { MailboxManager } from '..';
import { Ticket } from '../types';
import { generateDescription, generateEmbedOrString, generateHeader } from '../utils/TicketUtils';

export const handleClosing = async (manager : MailboxManager, ticket: Ticket) => {
  ticket.closedAt = Date.now();

  const userTickets = manager.userTickets.get(ticket.createdBy);
  if (userTickets) {
    
    userTickets.delete(ticket.id);
    if (userTickets.size === 0) manager.userTickets.delete(ticket.createdBy);

    if (manager.options.ticketClose) {
      const user = await manager.client.users.fetch(ticket.createdBy);
    
      const text = manager.options.ticketClose(userTickets?.size ?? 0);
      const header = generateHeader(manager, ticket.id);
      const description = generateDescription(manager, text);
      const message = generateEmbedOrString(manager, header, description, '', false);
    
      user.send(message);
    }

    manager.emit('ticketDelete', ticket);
    manager.emit('ticketLog', ticket);
  }
};
