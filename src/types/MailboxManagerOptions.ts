import { TextChannel, VoiceChannel, Snowflake, Collection } from 'discord.js';
import { DateTime } from 'luxon';

export type MailboxManagerOptions = {
  /**
   * The mailbox channels in which the content is sent (or from which the threads are created).
   *
   * @type {Collection<Snowflake, (TextChannel | VoiceChannel | Snowflake)>}
   */
  mailboxChannels: Collection<
    Snowflake,
    TextChannel | VoiceChannel | Snowflake
  >;

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
