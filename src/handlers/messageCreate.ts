import {
	Collection,
	Message,
	Snowflake,
	TextChannel,
	Constants,
	MessageEmbed,
	PartialMessage,
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
		message.channel.type ===
		Constants.ChannelTypes[Constants.ChannelTypes.DM];
	let userTickets: Collection<string, Ticket>;
	let ticket: Ticket;
	let botMessage: Message;
	let answer: Message;

	const isExistingTicket = !!message.reference;
	if (isExistingTicket) {
		let messageId: Snowflake;

		botMessage = await message.channel.messages.fetch(
			message.reference.messageId
		);

		messageId = extractMessageId(
			botMessage,
			!!manager.options.embedOptions
		);
		if (!messageId) return;

		userTickets = manager.userTickets.find((userTickets) =>
			userTickets.some((t) => t.messages.last().id === messageId)
		);
		if (!userTickets || userTickets.size === 0) return;

		ticket = userTickets.find((t) => t.messages.last().id === messageId);
		if (!ticket) return;

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
	}

	const ticketMessage = ticket.generateMessage(manager, message);
	switch (message.channel.type) {
		case Constants.ChannelTypes[Constants.ChannelTypes.DM]: {
			const mailboxChannel = await message.client.channels.fetch(
				manager.options.mailboxChannel
			);
			answer = await (mailboxChannel as TextChannel).send(
				ticketMessage instanceof MessageEmbed
					? { embeds: [ticketMessage] }
					: ticketMessage
			);

			if (manager.options.forceCloseEmoji) {
				await answer.react(manager.options.forceCloseEmoji);
			}
			return;
		}

		case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_TEXT]: {
			if (botMessage) {
				const embed = botMessage.embeds[0];
				if (embed) {
					embed.setAuthor(embed.author.name, arrowUp);
					await botMessage.edit({
						content: botMessage.content || null,
						embeds: [embed],
					});
				}

				if (manager.options.replySentEmoji) {
					await botMessage.reactions.removeAll();
					await botMessage.react(manager.options.replySentEmoji);
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
			return manager.emit(
				MailboxManagerEvents.replySent,
				message,
				answer
			);
		}

		default:
			console.error(
				`${message.channel.type} is not an authorized channel type.`
			);
			break;
	}
};
