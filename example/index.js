const { Client } = require('discord.js');
const { MailboxManager } = require('../lib');

const client = new Client();
const manager = new MailboxManager(client, {
  forceCloseEmoji: '❌',
  replySentEmoji: '📤',
  loggingOptions: {
    generateFilename: ticket => `log-ticket-${ticket.id}.txt`,
    format: msg => `[${new Date(msg.createdTimestamp)}] ${msg.author.username} | ${msg.cleanContent}`,
    generateMessage: ticket => `Logs for ticket ${ticket.id} - closed at ${new Date(ticket.closedAt)}`,
    sendToRecipient: false,
    channel: '797604112182149182',
    showName: false
  },
  mailboxChannel: '797604112182149182',
  deleteReplies: true,
  cronTime: '* * * * *', // run each minute
  closeTicketAfter: 60, // in seconds
  maxOngoingTicketsPerUser: 3,
  notAllowedToPing: 'You are not allowed to mention @everyone or @here in a mail!',
  replyMessage: 'Please use the "reply" feature to send an answer to this message.',
  tooMuchTickets: 'You have too much tickets that are not closed! Please wait for your tickets to be closed before submitting new ones.',
  replyMessageInFooter: true,
  embedOptions: {
    send: true,
    color: 12272523
  },
  formatTitle: id => `[Ticket] ${id}`
});

client.on('ready', () => console.log('Connected!'));

client.on('message', message => {
  if (message.content === 'show me the tickets collection') {
    message.reply(`\`\`\`js\n${JSON.stringify(manager.userTickets, null, 2)}\n\`\`\``);
  }
})

manager.on('ticketCreate', ticket => console.log(`${ticket.id} has been created!`));
manager.on('ticketUpdate', ticket => console.log(`${ticket.id} has been updated with a new message.`));
manager.on('ticketLog', (ticket) => console.log(`${ticket.id} got logged.`));
manager.on('ticketClose', ticket => console.log(`${ticket.id} got closed!`));
manager.on('ticketDelete', ticket => console.log(`${ticket.id} got deleted.`));

client.login('TOKEN');
