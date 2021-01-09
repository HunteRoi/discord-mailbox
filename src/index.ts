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
   * The collection of tickets.
   *
   * @type {Collection<Snowflake, Ticket>}
   * @memberof MailboxManager
   */
  public readonly tickets: Collection<Snowflake, Ticket>;

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
    this.tickets = new Collection();

    this.client.on('message', async (message) => handleMessage(this, message));
    if (this.options.forceCloseEmoji) {
      this.client.on('messageReactionAdd', async (messageReaction, user) => handleReaction(this, messageReaction, user));
    }

    this.on('ticketClose', async (ticket: Ticket) => handleClosing(this, ticket));
    this.on('ticketLog', async (ticket: Ticket) => handleLog(this, ticket));

    if (this.options.cronTime) {
      this.job = new CronJob(this.options.cronTime, () => {
        this.checkTickets();
      }, null, null, null, this);
      this.job.start();
    }

    this.canFormatLogs = this.options.loggingOptions && !!this.options.loggingOptions.format;
  }

  checkTickets() {
    this.tickets.each((ticket) => {
      const isOutdated = Date.now() - ticket.lastMessageAt > this.options.closeTicketAfter * 1000;
      if (isOutdated) {
        this.emit('ticketClose', ticket);
      }
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
