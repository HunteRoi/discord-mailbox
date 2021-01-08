const { Client } = require('discord.js');
const { MailboxManager } = require('../lib');

const client = new Client();
const manager = new MailboxManager(client, {
  cronTime: '* * * * *',
  forceCloseEmoji: '❌',
  replySentEmoji: '📤',
  loggingOptions: {
    type: 'text',
    format: msg => `[${msg.createdTimestamp}] ${msg.author.username}\n\`\`\`${msg.cleanContent}\`\`\``,
    sendToRecipient: false
  },
  mailboxChannel: '729381642824581121',
  deleteReplies: false,
  closeTicketAfter: 60*60,
  notAllowedToPing: 'You are not allowed to mention @everyone or @here in a mail!',
  replyMessage: 'Please use the "reply" feature to send an answer to this message.',
  replyMessageInFooter: true,
  embedOptions: {
    send: true,
    color: 12272523
  },
  formatTitle: id => `[Ticket] ${id}`
});

client.on('ready', () => {
  console.log('Connected!');
});

client.on('message', msg => {
  if (msg.content.startsWith('!createText')) {
    manager.emit('createText', msg);
  }
});

manager.on('ticketClose', ticket => console.log(`${ticket.id} got closed!`));

client.login('TOKEN');
