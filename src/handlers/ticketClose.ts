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
		if (ticket.threadId) {
			const channel = await manager.client.channels.fetch(ticket.threadId);
			const threadChannel = channel as ThreadChannel;
			threadChannel.setArchived(true);
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
