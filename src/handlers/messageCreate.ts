import {
  Collection,
  Message,
  Snowflake,
  TextChannel,
  Constants,
  MessageEmbed,
  PartialMessage,
  ThreadChannel,
  AllowedThreadTypeForTextChannel,
} from 'discord.js';

import { Ticket } from '../types';
import { MailboxManager, MailboxManagerEvents } from '..';
import { extractMessageId } from '../utils/MessageUtils';
import { arrowUp } from '../utils/constants';

export const handleMessage = async (
  manager: MailboxManager,
  msg: Message | PartialMessage
) => {
  let message: Message;
  if (msg.partial) {
    message = await message.fetch(true);
  } else message = msg as Message;

  if (message.author.bot) return;

  if (message.mentions.everyone) {
    return message.author.send(manager.options.notAllowedToPing);
  }

  const isFromDM =
    message.channel.type === Constants.ChannelTypes[Constants.ChannelTypes.DM];
  let userTickets: Collection<string, Ticket>;
  let ticket: Ticket;
  let previousMessage: Message;
  let answer: Message;

  const mainChannel = await message.client.channels.fetch(
    manager.options.mailboxChannel
  );
  if (!mainChannel) return;
  const mailboxChannel: TextChannel = mainChannel as TextChannel;
  let threadChannel: ThreadChannel | null = null;

  const isExistingTicket = Boolean(message.reference);
  if (isExistingTicket) {
    let messageId: Snowflake;

    previousMessage = await message.channel.messages.fetch(
      message.reference.messageId
    );

    messageId = extractMessageId(
      previousMessage,
      !!manager.options.embedOptions
    );
    if (!messageId) return;

    userTickets = manager.userTickets.find((userTickets) =>
      userTickets.some((t: Ticket) => t.messages.last().id === messageId)
    );
    if (!userTickets || userTickets.size === 0) return;

    ticket = userTickets.find(
      (t: Ticket) => t.messages.last().id === messageId
    );
    if (!ticket) return;
    if (ticket.threadId) {
      threadChannel = await mailboxChannel.threads.fetch(ticket.threadId);
    }

    if (isFromDM && ticket.isOutdated()) {
      return manager.emit(MailboxManagerEvents.ticketClose, ticket);
    }

    ticket.addMessage(message, manager.canFormatLogs);
    manager.emit(MailboxManagerEvents.ticketUpdate, ticket);
  } else {
    if (!isFromDM) return;

    ticket = new Ticket({
      firstMessage: message,
      formatLogs: manager.options.loggingOptions.format,
      closeAfter: manager.options.closeTicketAfter,
      shouldFormatLog: true,
    });
    userTickets = manager.userTickets.get(ticket.createdBy);

    if (
      userTickets &&
      userTickets.size === manager.options.maxOngoingTicketsPerUser
    ) {
      return message.author.send(manager.options.tooMuchTickets);
    } else {
      if (!userTickets) {
        manager.userTickets.set(ticket.createdBy, new Collection());
      }
      manager.userTickets.get(ticket.createdBy).set(ticket.id, ticket);
      manager.emit(MailboxManagerEvents.ticketCreate, ticket);
    }

    if (manager.options.threadOptions) {
      const startMessage = await mailboxChannel.send(
        manager.options.threadOptions.startMessage(ticket)
      );
      threadChannel = await mailboxChannel.threads.create({
        name: manager.options.threadOptions.name(ticket),
        autoArchiveDuration: 'MAX',
        startMessage,
        type: Constants.ChannelTypes[
          Constants.ChannelTypes.GUILD_PUBLIC_THREAD
        ] as AllowedThreadTypeForTextChannel,
      });
      ticket.setThreadId(threadChannel.id);
      manager.emit(MailboxManagerEvents.threadCreate, ticket, threadChannel);
    }
  }

  const ticketMessage = ticket.generateMessage(manager, message);
  switch (message.channel.type) {
    case Constants.ChannelTypes[Constants.ChannelTypes.DM]: {
      answer = await (threadChannel ?? mailboxChannel).send(
        ticketMessage instanceof MessageEmbed
          ? { embeds: [ticketMessage] }
          : ticketMessage
      );

      if (manager.options.forceCloseEmoji) {
        await answer.react(manager.options.forceCloseEmoji);
      }
      return;
    }

    case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_TEXT]:
    case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_PRIVATE_THREAD]:
    case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_PUBLIC_THREAD]: {
      if (previousMessage) {
        const embed = previousMessage.embeds[0];
        if (embed) {
          embed.setAuthor(embed.author.name, arrowUp);
          await previousMessage.edit({
            content: previousMessage.content || null,
            embeds: [embed],
          });
        }

        if (manager.options.replySentEmoji) {
          await previousMessage.reactions.removeAll();
          await previousMessage.react(manager.options.replySentEmoji);
        }
      }

      if (manager.options.deleteReplies) {
        await message.delete();
        manager.emit(MailboxManagerEvents.replyDelete, message);
      }

      answer = await ticket.messages
        .last()
        .author.send(
          ticketMessage instanceof MessageEmbed
            ? { embeds: [ticketMessage] }
            : ticketMessage
        );
      return manager.emit(MailboxManagerEvents.replySent, message, answer);
    }

    default:
      console.error(
        `${message.channel.type} is not an authorized channel type.`
      );
      break;
  }
};
