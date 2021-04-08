import { TextChannel } from 'discord.js';
import { MailboxManager } from '..';
import { Ticket } from '../types';

export const handleLog = async (manager: MailboxManager, ticket: Ticket) => {
  if (!manager.options.loggingOptions) return;
  
  const logMessage = {
    content: manager.options.loggingOptions.generateMessage(ticket),
    files: [
      {
        attachment: Buffer.from(ticket.logs.join('\n')),
        name: manager.options.loggingOptions.generateFilename(ticket),
      },
    ],
  };

  if (manager.options.loggingOptions.sendToRecipient) {
    const user = await manager.client.users.fetch(ticket.createdBy);
    await user.send(logMessage);
  }

  const channel = await manager.client.channels.fetch(manager.options.loggingOptions.channel);
  await(channel as TextChannel).send(logMessage);
};
