/**
 * Events fired by the {@link MailboxManager}
 *
 * @export
 * @enum {string}
 */
export enum MailboxManagerEvents {
	ticketCreate = 'ticketCreate',
	ticketUpdate = 'ticketUpdate',
	ticketLog = 'ticketLog',
	ticketClose = 'ticketClose',
	ticketForceClose = 'ticketForceClose',
	ticketDelete = 'ticketDelete',

	replySent = 'replySent',
	replyDelete = 'replyDelete',

	error = 'error',
}
