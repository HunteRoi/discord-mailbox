import { TextChannel } from 'discord.js';
import { MailboxManager } from '..';
import { Ticket } from '../types';
import * as diskette from 'diskette';

export const handleLog = async (manager: MailboxManager, ticket: Ticket) => {
  if (!manager.options.loggingOptions) return;

  const file = new diskette.File(ticket.logs.join('\n'));
  const logMessage = {
    content: manager.options.loggingOptions.generateMessage(ticket),
    files: [
      {
        attachment: file.buffer(),
        name: manager.options.loggingOptions.generateFilename(ticket)
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
