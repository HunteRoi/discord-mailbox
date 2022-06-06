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
    ticketLog = 'ticketLog'
}

export enum MessageBasedMailboxManagerEvents {
    threadCreate = 'threadCreate',
    replyDelete = 'replyDelete',
    replySent = 'replySent',
    ticketForceClose = 'ticketForceClose'
};

export enum InteractionBasedMailboxManagedEvents { }