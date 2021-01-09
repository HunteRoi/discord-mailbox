import { Client, ClientOptions, Collection, Snowflake } from 'discord.js';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';

import { handleMessage, handleReaction, handleClosing, handleLog} from './handlers';
import { MailboxManagerOptions, Ticket } from './types';

/**
 *The mailbox manager.
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
  public readonly userTickets: Collection<Snowflake, Collection<string, Ticket>>;

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
  canFormatLogs: boolean;

  /**
   *Creates an instance of MailboxManager.
   * @param {Client} client
   * @param {MailboxManagerOptions} [options]
   */
  constructor(client: Client, options: MailboxManagerOptions) {
    super();

    this.client = client;
    this.options = options;
    this.userTickets = new Collection();
    this.canFormatLogs = this.options.loggingOptions && !!this.options.loggingOptions.format;

    this.client.on('message', async (message) => handleMessage(this, message));
    if (this.options.forceCloseEmoji) {
      this.client.on('messageReactionAdd', async (messageReaction, user) => handleReaction(this, messageReaction, user));
    }

    this.on('ticketClose', async (ticket: Ticket) => handleClosing(this, ticket));
    this.on('ticketLog', async (ticket: Ticket) => handleLog(this, ticket));

    this.job = new CronJob(this.options.cronTime, () => this.checkTickets(), null, null, null, this);
    this.job.start();

  }

  checkTickets() {
    this.userTickets.each(userTickets => {
      userTickets.each(ticket => {
        const isOutdated = Date.now() - ticket.lastMessageAt > this.options.closeTicketAfter * 1000;
        if (isOutdated) {
          this.emit('ticketClose', ticket);
        }
      });
    });
  }
}

/**
 * A wrapper class for {@link Client} that carries a {@link MailboxManager} instance.
 *
 * @export
 * @class MailboxClient
 * @extends {Client}
 */
export class MailboxClient extends Client {
  /**
   * The mailbox manager.
   *
   * @type {MailboxManager}
   * @memberof MailboxClient
   */
  public readonly mailboxManager: MailboxManager;

  /**
   *Creates an instance of MailboxClient.
   * @param {ClientOptions} [options]
   * @param {MailboxManagerOptions} [mailboxOptions]
   * @memberof MailboxClient
   */
  constructor(mailboxOptions: MailboxManagerOptions, options?: ClientOptions) {
    super(options);

    this.mailboxManager = new MailboxManager(this, mailboxOptions);
  }
}

/**
 * Emitted when a new ticket is created by a user.
 * @event MailboxManager#ticketCreate
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on('ticketCreate', (ticket) => {
 *  console.log(`${ticket.id} has been created`);
 * });
 */

/**
 * Emitted when a ticket is updated. A ticket update is basically a new message sent or received.
 * @event MailboxManager#ticketUpdate
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on('ticketUpdate', (ticket) => {
 *  console.log(`${ticket.id} has been updated`);
 * });
 */

/**
 * Emitted when a ticket is logged. Always emitted when the ticket is getting closed.
 * @event MailboxManager#ticketLog
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on('ticketLog', (ticket) => {
 *  console.log(`${ticket.id} has been logged`);
 * });
 */

/**
 * Emitted when a ticket is closed.
 * @event MailboxManager#ticketClose
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on('ticketClose', (ticket) => {
 *  console.log(`${ticket.id} has been closed`);
 * });
 */

/**
 * Emitted when a ticket is force closed by someone.
 * @event MailboxManager#ticketForceClose
 * @param {Ticket} ticket The ticket
 * @param {Discord.User | Discord.PartialUser} user The user who force closed the ticket
 * @example
 * manager.on('ticketForceClose', (ticket, user) => {
 *  console.log(`${ticket.id} has been force closed by ${user.username}`);
 * });
 */

/**
 * Emitted when a ticket is removed from the collection. Always emitted when a ticket is closed.
 * @event MailboxManager#ticketDelete
 * @param {Ticket} ticket The ticket
 * @example
 * manager.on('ticketDelete', (ticket) => {
 *  console.log(`${ticket.id} has been deleted`);
 * });
 */

/**
 * Emitted when a reply is sent from a guild. Always emitted when a ticket is updated.
 * @event MailboxManager#replySent
 * @param {Discord.Message} message The message
 * @param {Discord.Message} answer The answer
 * @example
 * manager.on('replySent', (message, answer) => {
 *  console.log(message.id);
 *  console.log(answer.id);
 * });
 */

/**
 * Emitted when the original reply message is removed from the channel.
 * @event MailboxManager#replyDelete
 * @param {Discord.Message} message The message
 * @example
 * manager.on('replyDelete', (message) => {
 *  console.log(message.id);
 * });
 */