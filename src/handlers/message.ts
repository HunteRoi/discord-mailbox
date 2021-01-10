import { arrowUp } from './../utils/constants';
import { Collection, Message, Snowflake, TextChannel } from 'discord.js';
import * as uuid from 'uuid';

import { Ticket } from './../types';
import { MailboxManager } from '..';
import { generateMessage } from '../utils/TicketUtils';

export const handleMessage = async (manager: MailboxManager, message: Message) => {
  if (message.author.bot) return;

  if (message.mentions.everyone) {
    return message.author.send(manager.options.notAllowedToPing);
  }

  const isFromDM = message.channel.type === 'dm';
  let authorId = message.author.id;
  let ticket: Ticket;
  let botMessage: Message;
  let answer: Message;

  if (!!message.reference) {
    botMessage = await message.channel.messages.fetch(message.reference.messageID);

    let messageId: Snowflake;
    if (manager.options.embedOptions) {
      messageId = botMessage.embeds[0].footer?.text?.replace('ID: ', '');
    } else {
      const array = botMessage.content.split('\n\n​');
      const footer = array[array.length - 1];
      messageId = footer.replace('ID: ', '');
    }

    if (!messageId) return;

    const userTicket = manager.userTickets.find(userTickets => userTickets.some(t => t.messages.last().id === messageId));
    if (!userTicket) return;

    ticket = userTicket.find(t => t.messages.last().id === messageId);
    if (!ticket) return;

    const ticketIsOutdated = (Date.now() - ticket.lastMessageAt) >= (manager.options.closeTicketAfter * 1000);
    if (ticketIsOutdated && isFromDM) {
      return manager.emit('ticketClose', ticket);
    }

    ticket.lastMessageAt = message.createdTimestamp;
    ticket.messages.set(message.id, message);
    if (manager.canFormatLogs) {
      ticket.logs.push(manager.options.loggingOptions.format(message));
    }
    ticket.messages.sort((m1, m2) => m1.createdTimestamp - m2.createdTimestamp);

    manager.emit('ticketUpdate', ticket);
  } else {
    if (!isFromDM) return;

    ticket = {
      id: uuid.v4(),

      createdAt: message.createdTimestamp,
      createdBy: authorId,

      messages: new Collection<Snowflake, Message>().set(message.id, message),
      logs: manager.canFormatLogs ? [manager.options.loggingOptions.format(message)] : [],
      lastMessageAt: message.createdTimestamp,
    };

    const userTickets = manager.userTickets.get(ticket.createdBy);
    if (userTickets) {
      if (userTickets.size === manager.options.maxOngoingTicketsPerUser) {
        return message.author.send(manager.options.tooMuchTickets);
      }
    } else {
      manager.userTickets.set(ticket.createdBy, new Collection());
    }
    manager.userTickets.get(ticket.createdBy).set(ticket.id, ticket);
    manager.emit('ticketCreate', ticket);
  }

  const msg = generateMessage(manager, ticket, message);
  
  switch(message.channel.type) {
    case 'dm': {
      const mailboxChannel = await message.client.channels.fetch(manager.options.mailboxChannel);
      answer = await (mailboxChannel as TextChannel).send(msg);
      
      if (manager.options.forceCloseEmoji) {
        await answer.react(manager.options.forceCloseEmoji);
      }
      return;
    }
      
    case 'text': {
      if (botMessage) {
        const embed = botMessage.embeds[0];
        if (embed) {
          embed.setAuthor(embed.author.name, arrowUp);
          await botMessage.edit({ content: botMessage.content, embed });
        }

        if (manager.options.replySentEmoji) {
          await botMessage.react(manager.options.replySentEmoji);
        }
      }
    
      if (manager.options.deleteReplies) {
        await message.delete();
        manager.emit('replyDelete', message);
      }

      answer = await ticket.messages.last(2)[0].author.send(msg); 
      return manager.emit('replySent', message, answer);
    }

    default: break;
  }
};
