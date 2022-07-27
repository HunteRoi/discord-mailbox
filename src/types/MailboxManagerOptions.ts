import { TextChannel, VoiceChannel, Snowflake } from 'discord.js';
import { DateTime } from 'luxon';

export type MailboxManagerOptions = {
  /**
   * The mailbox channel in which the content is sent (or from which the thread are created).
   *
   * @type {(TextChannel | VoiceChannel | Snowflake)}
   */
  mailboxChannel: TextChannel | VoiceChannel | Snowflake;

  /**
   * The duration in milliseconds after a ticket's last activity before it gets closed.
   *
   * @type {number}
   */
  closeTicketAfterInMilliseconds: number;

  /**
   * The maximum number of ongoing tickets per user
   *
   * @type {number}
   */
  maxOnGoingTicketsPerUser: number;

  /**
   * The cron time for the background job in charge of checking the validity of all ongoing tickets.
   *
   * @type {(string | Date | DateTime)}
   */
  cronTime: string | Date | DateTime;
};
