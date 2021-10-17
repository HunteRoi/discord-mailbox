import { Client, Collection, Intents, Snowflake, Constants } from 'discord.js';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';

import {
	handleMessage,
	handleReaction,
	handleClosing,
	handleLog,
} from './handlers';
import { MailboxManagerOptions, Ticket } from './types';
import { MailboxManagerEvents } from '.';

/**
 * The manager of the mailbox feature
 *
 * @export
 * @class MailboxManager
 * @extends {EventEmitter}
 */
export class MailboxManager extends EventEmitter {
	/**
	 * The configuration of the mailbox manager.
	 *
	 * @private
	 * @type {MailboxManagerOptions}
	 */
	public readonly options: MailboxManagerOptions;

	/**
	 * The collection of tickets per user.
	 *
	 * @type {Collection<Snowflake, Collection<string, Ticket>>}
	 * @memberof MailboxManager
	 */
	public readonly userTickets: Collection<
		Snowflake,
		Collection<string, Ticket>
	>;

	/**
	 * The client that instantiated this Manager
	 * @name MailboxManager#client
	 * @type {Client}
	 * @readonly
	 */
	public readonly client: Client;

	/**
	 * The cron job to check if tickets need to be closed because outdated.
	 *
	 * @private
	 * @type {CronJob}
	 */
	private job?: CronJob;

	/**
	 * Whether the logging options is set with a format method or not
	 *
	 * @type {boolean}
	 */
	public canFormatLogs: boolean;

	/**
	 * Creates an instance of MailboxManager.
	 * @param {Client} client
	 * @param {MailboxManagerOptions} [options]
	 */
	constructor(
		client: Client,
		options: MailboxManagerOptions = {
			tooMuchTickets: 'You have too much opened tickets!',
			notAllowedToPing:
				'You are not allowed to mention @everyone and @here.',
			replyMessage: 'Use the "reply" feature to respond.',
			ticketClose: (nbUserTicketsLeft) =>
				`This ticket has been closed. You now have ${nbUserTicketsLeft} tickets that are still opened.`,
			maxOngoingTicketsPerUser: 3,
			closeTicketAfter: 60,
			formatTitle: (id) => `Ticket ${id}`,
			cronTime: '* * * * *',
			mailboxChannel: null,
		}
	) {
		super();

		const intents = new Intents(client.options.intents);
		if (!intents.has(Intents.FLAGS.GUILDS)) {
			throw new Error('GUILDS intent is required to use this package!');
		}
		if (!intents.has(Intents.FLAGS.GUILD_MESSAGES)) {
			throw new Error(
				'GUILD_MESSAGES intent is required to use this package!'
			);
		}
		if (!intents.has(Intents.FLAGS.DIRECT_MESSAGES)) {
			throw new Error(
				'DIRECT_MESSAGES intent is required to use this package!'
			);
		}
		if (
			options.forceCloseEmoji &&
			!intents.has(Intents.FLAGS.GUILD_MESSAGE_REACTIONS)
		) {
			throw new Error(
				'GUILD_MESSAGE_REACTIONS intent is required to use this package!'
			);
		}

		const partials = client.options.partials;
		if (!partials.includes(Constants.PartialTypes.CHANNEL)) {
			throw new Error('CHANNEL partial is required to use this package!');
		}
		if (!partials.includes(Constants.PartialTypes.MESSAGE)) {
			throw new Error('MESSAGE partial is required to use this package!');
		}

		if (!options.mailboxChannel) {
			throw new Error(
				'Please define the mailbox channel in the options!'
			);
		}

		this.client = client;
		this.options = options;
		this.userTickets = new Collection();
		this.canFormatLogs =
			this.options.loggingOptions && !!this.options.loggingOptions.format;

		this.client.on('messageCreate', async (message) => {
			handleMessage(this, message);
		});
		if (this.options.forceCloseEmoji) {
			this.client.on(
				'messageReactionAdd',
				async (messageReaction, user) => {
					await handleReaction(this, messageReaction, user);
				}
			);
		}

		this.on(MailboxManagerEvents.ticketClose, async (ticket: Ticket) =>
			handleClosing(this, ticket)
		);
		this.on(MailboxManagerEvents.ticketLog, async (ticket: Ticket) =>
			handleLog(this, ticket)
		);

		this.job = new CronJob(
			this.options.cronTime,
			() => this.checkTickets(),
			null,
			null,
			null,
			this
		);
		this.job.start();
	}

	checkTickets() {
		this.userTickets.each((userTickets) => {
			userTickets.each((ticket) => {
				if (ticket.isOutdated()) {
					this.emit(MailboxManagerEvents.ticketClose, ticket);
				}
			});
		});
	}
}

/**
 * Emitted when a new ticket is created by a user.
 * @event MailboxManager#ticketCreate
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on(MailboxManagerEvents.ticketCreate, (ticket) => {
 *  console.log(`${ticket.id} has been created`);
 * });
 */

/**
 * Emitted when a ticket is updated. A ticket update is basically a new message sent or received.
 * @event MailboxManager#ticketUpdate
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on(MailboxManagerEvents.ticketUpdate, (ticket) => {
 *  console.log(`${ticket.id} has been updated`);
 * });
 */

/**
 * Emitted when a ticket is logged. Always emitted when the ticket is getting closed.
 * @event MailboxManager#ticketLog
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on(MailboxManagerEvents.ticketLog, (ticket) => {
 *  console.log(`${ticket.id} has been logged`);
 * });
 */

/**
 * Emitted when a ticket is closed.
 * @event MailboxManager#ticketClose
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on(MailboxManagerEvents.ticketClose, (ticket) => {
 *  console.log(`${ticket.id} has been closed`);
 * });
 */

/**
 * Emitted when a ticket is force closed by someone.
 * @event MailboxManager#ticketForceClose
 * @param {Ticket} ticket The ticket
 * @param {Discord.User | Discord.PartialUser} user The user who force closed the ticket
 * @example
 * manager.on(MailboxManagerEvents.ticketForceClose, (ticket, user) => {
 *  console.log(`${ticket.id} has been force closed by ${user.username}`);
 * });
 */

/**
 * Emitted when a ticket is removed from the collection. Always emitted when a ticket is closed.
 * @event MailboxManager#ticketDelete
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on(MailboxManagerEvents.ticketDelete, (ticket) => {
 *  console.log(`${ticket.id} has been deleted`);
 * });
 */

/**
 * Emitted when a reply is sent from a guild. Always emitted when a ticket is updated.
 * @event MailboxManager#replySent
 * @param {Discord.Message} message The message
 * @param {Discord.Message} answer The answer
 * @example
 * manager.on(MailboxManagerEvents.replySent, (message, answer) => {
 *  console.log(message.id);
 *  console.log(answer.id);
 * });
 */

/**
 * Emitted when the original reply message is removed from the channel.
 * @event MailboxManager#replyDelete
 * @param {Discord.Message} message The message
 * @example
 * manager.on(MailboxManagerEvents.replyDelete, (message) => {
 *  console.log(message.id);
 * });
 */
