import { checked } from './../utils/constants';
import { MailboxManager } from '..';
import { MessageReaction, PartialUser, User, Snowflake } from 'discord.js';

export const handleReaction = async (manager: MailboxManager, messageReaction: MessageReaction, user: User | PartialUser) => {
  if (user.bot) return;
  if (messageReaction.emoji.name !== manager.options.forceCloseEmoji) return;

  const botMessage = messageReaction.message;

  let messageId: Snowflake;
  if (manager.options.embedOptions) {
    messageId = botMessage.embeds[0].footer.text.replace('ID: ', '');
  } else {
    const array = botMessage.content.split('\n\n​');
    const footer = array[array.length - 1];
    messageId = footer.replace('ID: ', '');
  }

  const ticket = manager.tickets.find(t => t.messages.last().id === messageId);
  if (!ticket) return;
  
  const embed = botMessage.embeds[0];
  if (embed) {
    embed.setAuthor(embed.author.name, checked);
    await botMessage.edit({ content: botMessage.content, embed });
  }

  return manager.emit('ticketClose', ticket);
};
