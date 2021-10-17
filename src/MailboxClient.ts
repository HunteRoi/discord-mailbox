import { Client, ClientOptions } from 'discord.js';

import { MailboxManagerOptions } from './types';
import { MailboxManager } from './MailboxManager';

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
	constructor(
		mailboxOptions: MailboxManagerOptions,
		options?: ClientOptions
	) {
		super(options);

		this.mailboxManager = new MailboxManager(this, mailboxOptions);
	}
}
