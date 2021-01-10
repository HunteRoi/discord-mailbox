import { Message, MessageEmbed } from 'discord.js';
import { MailboxManager } from '..';
import { Ticket } from '../types';
import { arrowDown } from './constants';
import { isNullOrWhiteSpaces } from './StringUtils';

/**
 * Generates the header, description and footer texts then return the generated message or embed.
 *
 * @export
 * @param {MailboxManager} manager
 * @param {Ticket} ticket
 * @param {Message} message
 * @returns
 */
export function generateMessage(manager: MailboxManager, ticket: Ticket, message: Message) {
  const isSentToAdmin = message.channel.type === 'dm';

  const header = generateHeader(manager, ticket.id);
  const description = isSentToAdmin || manager.options.loggingOptions.showName 
    ? generateDescription(manager, message, null, `\n\n**${manager.options.replyMessage}**`)
    : generateDescription(manager, message, `${message.author.username}:\n`, `\n\n**${manager.options.replyMessage}**`);
  const footer = generateFooter(message.id);

  return generateEmbedOrString(manager, header, description, footer, isSentToAdmin);
  
}

/**
 * Generates the header text.
 *
 * @export
 * @param {MailboxManager} manager
 * @param {string} ticketId
 * @returns
 */
export function generateHeader(manager: MailboxManager, ticketId: string) {
  const header = manager.options.formatTitle(ticketId);
  if (isNullOrWhiteSpaces(header) || !header.includes(ticketId)) throw new Error('Ticket title must at least contain the ticket id');

  return header;
}

/**
 * Generates the description text.
 *
 * @export
 * @param {MailboxManager} manager
 * @param {(Message | string)} message
 * @param {string} [prefix]
 * @returns
 */
export function generateDescription(manager: MailboxManager, message: Message | string, prefix?: string, suffix?: string) {
  const stringBuilder: string[] = [];

  if (prefix && !isNullOrWhiteSpaces(prefix)) {
    stringBuilder.push(prefix);
  }
  
  if (message instanceof Message) {
    stringBuilder.push(message.cleanContent);
  } else {
    stringBuilder.push(message);
  }

  if (suffix && !isNullOrWhiteSpaces(suffix)) {
    stringBuilder.push(suffix);
  }
  
  return stringBuilder.join('');
}

/**
 * Generates the footer text.
 *
 * @export
 * @param {string} messageId
 * @returns
 */
export function generateFooter(messageId: string) {
  return `ID: ${messageId}`;
}

/**
 * Based on the provider header, description & footer texts, generate an embed or a plaintext message.
 *
 * @export
 * @param {MailboxManager} manager
 * @param {string} header
 * @param {string} description
 * @param {string} footer
 * @param {boolean} isSentToAdmin
 * @returns
 */
export function generateEmbedOrString(manager: MailboxManager, header: string, description: string, footer: string, isSentToAdmin: boolean) {
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

    if (isSentToAdmin) {
      embed.setAuthor(embed.author.name, arrowDown);
    }

    return embed;
  }

  return `${header}\n\n​${description}\n\n​${footer}`;
}