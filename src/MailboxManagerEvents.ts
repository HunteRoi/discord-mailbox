/**
 * Events fired by the {@link MailboxManager}
 *
 * @export
 * @enum {string}
 */
export enum MailboxManagerEvents {
    ticketCreate = 'ticketCreate',
    ticketUpdate = 'ticketUpdate',
    ticketClose = 'ticketClose',
    ticketLog = 'ticketLog',

    threadCreate = 'threadCreate',
    replySent = 'replySent',
    ticketForceClose = 'ticketForceClose'
}