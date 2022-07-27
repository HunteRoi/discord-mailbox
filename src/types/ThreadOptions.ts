import { MessageOptions } from 'discord.js';
import { Ticket } from './Ticket';

export type ThreadOptions = {
  /**
   * A function to build the thread name based on the provided ticket.
   *
   */
  name: (ticket: Ticket) => string;

  /**
   * A function to create a start message for the thread.
   *
   */
  startMessage: (ticket: Ticket) => string | MessageOptions;
};
