const noOpenedTicketWithId = '0001 - Provided ticket ID does not exist for any user';
const tooMuchTicketsOpened = '0002 - Too much tickets for this user';
const messageHasNoTicket = '0003 - No ticket related to this message';
const headerMustContainTicketId = '0004 - Ticket title must at least contain the ticket id';
const noPreviousMessageId = '0005 - Previous message does not contain message ID';
const messageIsNotReply = '0006 - Message is not a reply';
const notForceCloseEmoji = '0007 - Reaction emoji is not for force close';
const senderNamesAppear = '0008 - Sender names appear although the options is disabled';
const noMailboxRegistered = '0009 - There is no mailbox registered in the options';
const guildNotRegistered = '0010 - The provided guild is not registered by the mailbox manager';

export default {
  noOpenedTicketWithId,
  tooMuchTicketsOpened,
  messageHasNoTicket,

  headerMustContainTicketId,
  noPreviousMessageId,
  messageIsNotReply,
  notForceCloseEmoji,
  senderNamesAppear,
  noMailboxRegistered,

  guildNotRegistered
};
