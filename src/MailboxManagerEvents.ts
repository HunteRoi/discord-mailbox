/**
 * Events fired by the {@link MailboxManager}
 *
 * @export
 * @enum {string}
 */
export enum MailboxManagerEvents {
  /**
   * Emitted when a ticket is created
   */
  ticketCreate = 'ticketCreate',
  /**
   * Emitted when a ticket is updated
   */
  ticketUpdate = 'ticketUpdate',
  /**
   * Emitted when a ticket is closed
   */
  ticketClose = 'ticketClose',
  /**
   * Emitted when a ticket is logged
   */
  ticketLog = 'ticketLog',

  /**
   * Emitted once a thread is created for a ticket
   */
  threadCreate = 'threadCreate',
  /**
   * Emitted once a reply is sent for a ticket.
   */
  replySent = 'replySent',
  /**
   * Emitted once a ticket is force-closed.
   */
  ticketForceClose = 'ticketForceClose',
}
