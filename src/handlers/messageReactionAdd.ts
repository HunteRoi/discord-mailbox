import {
	MessageReaction,
	PartialUser,
	User,
	Snowflake,
	PartialMessageReaction,
	PartialMessage,
	Collection,
	Message,
} from 'discord.js';

import { extractMessageId } from '../utils/MessageUtils';
import { Ticket } from '../types';
import { checked } from './../utils/constants';
import { MailboxManager, MailboxManagerEvents } from '..';

export const handleReaction = async (
	manager: MailboxManager,
	messageReaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser
) => {
	let botMessage: Message | PartialMessage;
	let messageId: Snowflake;
	let userTickets: Collection<string, Ticket>;
	let ticket: Ticket;

	if (user.bot) return;
	if (messageReaction.emoji.name !== manager.options.forceCloseEmoji) return;

	botMessage = messageReaction.message;
	messageId = extractMessageId(botMessage, !!manager.options.embedOptions);
	if (!messageId) return;

	userTickets = manager.userTickets.find((userTickets) =>
		userTickets.some((t) => t.messages.last().id === messageId)
	);
	if (!userTickets) return;

	ticket = userTickets.find((t) => t.messages.last().id === messageId);
	if (!ticket) return;

	const embed = botMessage.embeds && botMessage.embeds[0];
	if (embed) {
		embed.setAuthor(embed.author.name, checked);
		await botMessage.edit({
			content: botMessage.content || null,
			embeds: [embed],
		});
	}

	manager.emit(MailboxManagerEvents.ticketForceClose, ticket, user);
	return manager.emit(MailboxManagerEvents.ticketClose, ticket);
};
