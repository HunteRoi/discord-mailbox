import { TextChannel } from 'discord.js';
import { MailboxManager } from '..';
import { Ticket } from '../types';
import { WritableStreamBuffer } from 'stream-buffers';

export const handleLog = async (manager: MailboxManager, ticket: Ticket) => {
  if (!manager.options.loggingOptions) return;

  const stream = new WritableStreamBuffer({
    initialSize: 100 * 1024, // start at 100 kilobytes.
    incrementAmount: 10 * 1024, // grow by 10 kilobytes each time buffer overflows.
  });
  for (let log of ticket.logs) {
    stream.write(`${log}\n`);
  }
  const buffer = stream.getContents();
  
  const logMessage = {
    content: manager.options.loggingOptions.generateMessage(ticket),
    files: [
      {
        attachment: buffer as Buffer,
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
