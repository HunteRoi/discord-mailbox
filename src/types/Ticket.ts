import {
	Collection,
	Constants,
	Message,
	MessageEmbed,
	Snowflake,
} from 'discord.js';
import * as uuid from 'uuid';

import { MailboxManager } from '..';
import { isNullOrWhiteSpaces } from '../utils/StringUtils';
import { arrowDown } from '../utils/constants';
import { TicketNamedParameter } from './TicketNamedParameter';

/**
 *
 *
 * @export
 * @class Ticket
 */
export class Ticket {
	//#region Fields
	/**
	 * The identifier of the ticket.
	 *
	 * @type {string}
	 */
	id: string;

	/**
	 * The messages related to that ticket.
	 *
	 * @type {Collection<Snowflake, Message>}
	 */
	messages: Collection<Snowflake, Message>;

	/**
	 * The generated logs for that ticket.
	 *
	 * @type {Array<string>}
	 */
	logs: Array<string>;

	/**
	 * The time in milliseconds at which the last message of the ticket has been sent.
	 *
	 * @type {number}
	 */
	lastMessageAt: number;

	/**
	 * The identifier of the user who initiated the ticket.
	 *
	 * @type {Snowflake}
	 */
	createdBy: Snowflake;

	/**
	 * The time in milliseconds at which the ticket was created.
	 *
	 * @type {number}
	 */
	createdAt: number;

	/**
	 * The time in milliseconds at which the ticket was closed.
	 *
	 * @type {number}
	 */
	closedAt?: number;

	/**
	 * The method that formats a message before adding it to the logs.
	 *
	 * @memberof Ticket
	 */
	formatLogs?: (message: Message) => string;

	/**
	 * Seconds after which, if no interaction with the ticket, it should be closed.
	 *
	 * @type {number}
	 * @memberof Ticket
	 */
	closeAfter: number;

	/**
	 * The thread channel id in which the ticket is managed on the guild side. If not set, the manager's mailbox is used instead.
	 *
	 * @type {Snowflake | null}
	 * @memberof Ticket
	 */
	threadId?: Snowflake | null;
	//#endregion

	/**
	 * Creates an instance of Ticket.
	 * @param {TicketNamedParameter} [parameters={
	 * 			formatLogs: null,
	 * 			closeAfter: 60,
	 * 			shouldFormatLog: false,
	 * 		}]
	 * @memberof Ticket
	 */
	constructor(
		parameters: TicketNamedParameter = {
			firstMessage: null,
			formatLogs: null,
			closeAfter: 60,
			shouldFormatLog: false,
		}
	) {
		if (!parameters.firstMessage)
			throw new Error('A first message is mandatory!');

		this.id = uuid.v4();
		this.messages = new Collection<Snowflake, Message>();
		this.logs = [];
		this.formatLogs = parameters.formatLogs;
		this.closeAfter = parameters.closeAfter;
		this.createdAt = parameters.firstMessage.createdTimestamp;
		this.createdBy = parameters.firstMessage.author.id;

		this.addMessage(parameters.firstMessage, parameters.shouldFormatLog);
	}

	/**
	 * Sets the thread channel id.
	 *
	 * @param {Snowflake} threadId
	 * @memberof Ticket
	 */
	setThreadId(threadId: Snowflake) {
		this.threadId = threadId;
	}

	/**
	 * Add a message to the collection of messages of a ticket.
	 *
	 * @param {Message} message
	 * @memberof Ticket
	 */
	addMessage(message: Message, shouldFormatLogs: boolean = false) {
		this.messages.set(message.id, message);
		this.messages.sort(
			(message1, message2) =>
				message1.createdTimestamp - message2.createdTimestamp
		);
		this.lastMessageAt = message.createdTimestamp;

		this.addLogs(message, shouldFormatLogs);
	}

	/**
	 * Add a message to the logs of the ticket.
	 *
	 * @private
	 * @param {Message} message
	 * @param {bool} shouldFormatLogs
	 * @memberof Ticket
	 */
	private addLogs(message: Message, shouldFormatLogs: boolean = false) {
		if (shouldFormatLogs && this.formatLogs) {
			this.logs.push(this.formatLogs(message));
		} else {
			this.logs.push(message.cleanContent);
		}
	}

	/**
	 * Whether a ticket is supposed to be closed or not due to [out of date].
	 *
	 * @return {boolean} if the ticket is outdated or not
	 * @memberof Ticket
	 */
	isOutdated(): boolean {
		return Date.now() - this.lastMessageAt >= this.closeAfter * 1000;
	}

	/**
	 * Generates the header, description and footer texts then return the generated message or embed.
	 *
	 * @param {MailboxManager} manager
	 * @param {Message | string} messageOrText
	 * @memberof Ticket
	 */
	generateMessage(manager: MailboxManager, messageOrText: Message | string) {
		const isSentToAdmin =
			messageOrText instanceof Message
				? messageOrText.channel.type ===
				  Constants.ChannelTypes[Constants.ChannelTypes.DM]
				: false;

		const header = this.generateHeader(this.id, manager);
		const description =
			messageOrText instanceof Message
				? this.generateDescription(
						messageOrText,
						isSentToAdmin || manager.options.loggingOptions.showName
							? `${messageOrText.author.username}:\n`
							: null,
						`\n\n**${manager.options.replyMessage}**`
				  )
				: this.generateDescription(messageOrText);
		const footer =
			messageOrText instanceof Message
				? this.generateFooter(messageOrText.id)
				: '';

		return this.generateEmbedOrString(
			manager,
			header,
			description,
			footer,
			isSentToAdmin
		);
	}

	/**
	 * Generates the header text.
	 *
	 * @export
	 * @param {MailboxManager} manager
	 * @param {string} ticketId
	 * @returns
	 */
	private generateHeader(ticketId: string, manager: MailboxManager) {
		const header = manager.options.formatTitle(ticketId);
		if (isNullOrWhiteSpaces(header) || !header.includes(ticketId))
			throw new Error('Ticket title must at least contain the ticket id');

		return header;
	}

	/**
	 * Generates the description text.
	 *
	 * @export
	 * @param {Message | string} messageOrText
	 * @param {string} [prefix]
	 * @param {string} [suffix]
	 * @returns
	 */
	private generateDescription(
		messageOrText: Message | string,
		prefix?: string,
		suffix?: string
	) {
		const stringBuilder: string[] = [];

		if (prefix && !isNullOrWhiteSpaces(prefix)) {
			stringBuilder.push(prefix);
		}

		if (messageOrText instanceof Message) {
			stringBuilder.push(messageOrText.cleanContent);
		} else {
			stringBuilder.push(messageOrText);
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
	private generateFooter(messageId: string) {
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
	private generateEmbedOrString(
		manager: MailboxManager,
		header: string,
		description: string,
		footer: string,
		isSentToAdmin: boolean
	) {
		if (manager.options.embedOptions?.send) {
			const embed = new MessageEmbed(manager.options.embedOptions)
				.setAuthor(header)
				.setDescription(description)
				.setFooter(footer)
				.setTimestamp();

			if (isSentToAdmin) {
				embed.setAuthor(embed.author.name, arrowDown);
			}

			return embed;
		}

		return `${header}\n\n​${description}\n\n​${footer}`;
	}
}
