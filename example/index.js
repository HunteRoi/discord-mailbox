const { Client, Message } = require('discord.js');
const { MailboxManager } = require('../lib');

const client = new Client();
const manager = new MailboxManager(client, {
  cronTime: '* * * * *',
  forceCloseEmoji: '❌',
  replySentEmoji: '📤',
  loggingOptions: {
    generateFilename: ticket => `log-ticket-${ticket.id}.txt`,
    format: msg => `[${new Date(msg.createdTimestamp)}] ${msg.author.username}\n\`\`\`${msg.cleanContent}\`\`\`\n`,
    generateMessage: ticket => `Logs for ticket ${ticket.id} - closed at ${new Date(ticket.closedAt)}`,
    sendToRecipient: false,
    channel: '729381642824581121',
    showName: false
  },
  mailboxChannel: '729381642824581121',
  deleteReplies: true,
  closeTicketAfter: 5,
  notAllowedToPing: 'You are not allowed to mention @everyone or @here in a mail!',
  replyMessage: 'Please use the "reply" feature to send an answer to this message.',
  replyMessageInFooter: true,
  embedOptions: {
    send: true,
    color: 12272523
  },
  formatTitle: id => `[Ticket] ${id}`
});

client.on('ready', () => console.log('Connected!'));

manager.on('ticketCreate', ticket => console.log(`${ticket.id} has been created!`));
manager.on('ticketUpdate', ticket => console.log(`${ticket.id} has been updated with a new message.`));
manager.on('ticketLog', (ticket) => console.log(`${ticket.id} got logged.`));
manager.on('ticketClose', ticket => console.log(`${ticket.id} got closed!`));
manager.on('ticketDelete', ticket => console.log(`${ticket.id} got deleted.`));

client.login('TOKEN');
