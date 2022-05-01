import { MessageEmbed } from 'discord.js';
import { MailboxManager } from '..';
import { Ticket } from '../types';

export const handleOpening = async (
  manager: MailboxManager,
  ticket: Ticket
) => {
  if (manager.options.autoReplyMessage) {
    const user = await manager.client.users.fetch(ticket.createdBy);
    const message: string | MessageEmbed = ticket.generateMessage(
      manager,
      manager.options.autoReplyMessage
    );
    await user.send(
      message instanceof MessageEmbed ? { embeds: [message] } : message
    );
  }
};
