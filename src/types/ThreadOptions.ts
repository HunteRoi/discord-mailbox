import { Ticket } from '.';

export interface ThreadOptions {
  /**
   * Allows to set the name of the thread. You can use whatever you need from the ticket object.
   *
   * @memberof ThreadOptions
   */
  name: (ticket: Ticket) => string;

  /**
   * The message sent in the mailbox to create a thread.
   *
   * @type {string}
   * @memberof ThreadOptions
   */
  startMessage: (ticket: Ticket) => string;
}
