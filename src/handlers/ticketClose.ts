import { MessageEmbed, ThreadChannel } from 'discord.js';

import { MailboxManager, MailboxManagerEvents } from '..';
import { Ticket } from '../types';

export const handleClosing = async (
  manager: MailboxManager,
  ticket: Ticket
) => {
  ticket.closedAt = Date.now();

  const userTickets = manager.userTickets.get(ticket.createdBy);
  if (userTickets) {
    const channel = ticket.threadId
      ? await manager.client.channels.fetch(ticket.threadId)
      : null;
    if (channel) {
      const threadChannel = channel as ThreadChannel;
      if (threadChannel) {
        threadChannel.setArchived(true);
        manager.emit(MailboxManagerEvents.threadArchive, ticket, threadChannel);
      }
    }

    userTickets.delete(ticket.id);
    if (userTickets.size === 0) manager.userTickets.delete(ticket.createdBy);

    if (manager.options.ticketClose) {
      const user = await manager.client.users.fetch(ticket.createdBy);

      const text = manager.options.ticketClose(userTickets?.size ?? 0);
      const message = ticket.generateMessage(manager, text);
      user.send(
        message instanceof MessageEmbed ? { embeds: [message] } : message
      );
    }

    manager.emit(MailboxManagerEvents.ticketDelete, ticket);
    manager.emit(MailboxManagerEvents.ticketLog, ticket);
  }
};
