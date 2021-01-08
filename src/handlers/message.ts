import { Collection, Message, MessageEmbed, Snowflake, TextChannel } from 'discord.js';
import * as uuid from 'uuid';

import { Ticket } from './../types';
import { MailboxManager } from '..';
import { isNullOrWhiteSpaces } from '../utils/StringUtils';

export const handleMessage = async (manager: MailboxManager, message: Message) => {
  if (message.author.bot) return;

  if (message.mentions.everyone) {
    return message.author.send(manager.options.notAllowedToPing);
  }

  const authorId = message.author.id;
  const isFromDM = message.channel.type === 'dm';
  let ticket: Ticket;
  let botMessage: Message;
  let answer: Message;

  if (!!message.reference) {
    ticket = manager.tickets.get(authorId);
    if (!ticket) return;

    const ticketIsOutdated = (Date.now() - ticket.lastMessageAt) >= (manager.options.closeTicketAfter * 1000);
    if (ticketIsOutdated && isFromDM) {
      return manager.emit('ticketClose', ticket);
    }

    const lastMessage = ticket.messages.last();
    botMessage = await message.channel.messages.fetch(message.reference.messageID);
    
    let messageId;
    if (manager.options.embedOptions) {
      messageId = botMessage.embeds[0].footer.text.replace('ID: ', '');
    } else {
      const array = botMessage.content.split('\n\n​');
      const footer = array[array.length - 1];
      messageId = footer.replace('ID: ', '');
    }
    if (lastMessage.id !== messageId) return;

    ticket.lastMessageAt = message.createdTimestamp;
    ticket.messages.set(message.id, message);
    ticket.messagesContent.push(message.cleanContent);
    ticket.messages.sort((m1, m2) => m1.createdTimestamp - m2.createdTimestamp);

    manager.emit('ticketUpdate', ticket);
  } else {
    if (!isFromDM) return;

    ticket = {
      id: uuid.v4(),

      createdAt: message.createdTimestamp,
      createdBy: authorId,

      messages: new Collection<Snowflake, Message>().set(message.id, message),
      messagesContent: [message.cleanContent],
      lastMessageAt: message.createdTimestamp,
    };

    manager.tickets.set(ticket.createdBy, ticket);
    manager.emit('ticketCreate', ticket);
  }

  const msg = generateMessage(manager, ticket, message);
  
  switch(message.channel.type) {
    case 'dm': 
      const mailboxChannel = await message.client.channels.fetch(manager.options.mailboxChannel);
      answer = await (mailboxChannel as TextChannel).send(msg);
      if (manager.options.forceCloseEmoji) {
        await answer.react(manager.options.forceCloseEmoji);
      }
      return;
      
    case 'text': 
      if (botMessage && manager.options.replySentEmoji) {
        await botMessage.react(manager.options.replySentEmoji);
      }
      if (manager.options.deleteReplies) {
        await message.delete();
        manager.emit('replyDelete', message);
      }
      answer = await ticket.messages.last(2)[0].author.send(msg); 
      return manager.emit('replySent', message, answer);

    default: break;
  }
};

function generateMessage(manager: MailboxManager, ticket: Ticket, message: Message) {
  const header = manager.options.formatTitle(ticket.id);
  if (isNullOrWhiteSpaces(header) || !header.includes(ticket.id)) throw new Error("Ticket title must at least contain the ticket id");

  const description = `${message.cleanContent}\n\n${manager.options.replyMessage}`;
  const footer = `ID: ${message.id}`;
  
  if (manager.options.embedOptions && manager.options.embedOptions.send) {
    const embed = new MessageEmbed()
      .setAuthor(header)
      .setDescription(description)
      .setFooter(footer)
      .setTimestamp();
    
    if (manager.options.embedOptions.thumbnail && manager.options.embedOptions.thumbnail.url) {
      embed.setThumbnail(manager.options.embedOptions.thumbnail.url);
    }
    if (manager.options.embedOptions.image && manager.options.embedOptions.image.url) {
      embed.setImage(manager.options.embedOptions.image.url);
    }
    if (manager.options.embedOptions.color) {
      embed.setColor(manager.options.embedOptions.color);
    }

    return embed;
  }

  return `${header}\n\n​${description}\n\n​${footer}`;
}