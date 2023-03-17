export default enum ErrorMessages {
  noOpenedTicketWithId = '0001 - Provided ticket ID does not exist for any user',
  tooMuchTicketsOpened = '0002 - Too much tickets for this user',
  messageHasNoTicket = '0003 - No ticket related to this message',
  senderNamesAppear = '0004 - Sender names appear although the options is disabled',
  noMailboxRegistered = '0005 - There is no mailbox registered in the options',
  guildNotRegistered = '0006 - The provided guild is not registered by the mailbox manager',
}
