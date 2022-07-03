const { Client, Intents, Constants } = require('discord.js');

const { InteractionBasedMailboxManager, MailboxManagerEvents, MessageBasedMailboxManagerEvents, InteractionBasedMailboxManagerEvents } = require('../lib');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  partials: [ Constants.PartialTypes.CHANNEL, Constants.PartialTypes.MESSAGE ],
});
const manager = new InteractionBasedMailboxManager(client, {
  mailboxChannel: 'TEXT_CHANNEL_ID',
  closeTicketAfterInMilliseconds: 60000, // in milliseconds
  maxOngoingTicketsPerUser: 3,
  cronTime: '* * * * *', // run each minute
  loggingOptions: {
    generateFilename: (ticket) => `log-ticket-${ticket.id}.txt`,
    generateMessage: (ticket) =>
      `Logs for ticket ${ticket.id} - closed at ${new Date(ticket.closedAt)}`,
    generateLogEntry: (ticketContent) =>
      `[${new Date(ticketContent.createdTimestamp)}] ${ticketContent.author.username} | ${
        ticketContent.cleanContent
      }`,
    showSenderNames: true,
    sendToRecipient: false,
    channel: 'TEXT_CHANNEL_ID',
    sendInThread: true,
  },
  threadOptions: {
    name: (ticket) => `Ticket ${ticket.id}`,
    startMessage: (ticket) => `New ticket created by ${ticket.createdBy} for <@&ROLE_ID>`,
  },
  embedOptions: {
    color: 12272523,
  },
  forceCloseEmoji: '❌',
  replySentEmoji: '📤',
  formatTitle: (ticket) => `[Ticket] ${ticket.id}`,
  replyMessage:
    'Please use the "reply" feature to send an answer to this message.',
  closedChannelPrefix: '[Closed] ',
  tooMuchTickets:
    'You have too much tickets that are not closed! Please wait for your tickets to be closed before submitting new ones.',
  openTicketCommandName: 'createTicket',
  startButtonOptions: {
    label: 'OPEN TICKET'
  },
  replyButtonOptions: {
    label: 'REPLY'
  },
  closeButtonOptions: {
    label: 'CLOSE'
  },
  modalOptions: {
    title: 'Create Ticket',
    modalComponentsOptions: {
      placeholder: 'Write down your message here',
      label: 'Your message',
      style: 'PARAGRAPH'
    }
  }
});

client.on('ready', () => console.log('Connected!'));
client.on('messageCreate', (message) => {
  if (message.content === 'show me the tickets collection') {
    message.reply(
      `\`\`\`js\n${JSON.stringify(manager.usersTickets, null, 2)}\n\`\`\``
    );
  }
});

manager.on(MailboxManagerEvents.ticketCreate, async (ticket) => {
  console.log(`${ticket.id} has been created!`);

  // autoReplyMessage feature
  const user = ticket.createdBy;
  await user.send('Your ticket has been received and will be treated soon. Please remain patient as we get back to you!');
});
manager.on(MailboxManagerEvents.ticketUpdate, (ticket) =>
  console.log(`${ticket.id} has been updated with a new message.`)
);
manager.on(MailboxManagerEvents.ticketLog, (ticket) =>
  console.log(`${ticket.id} got logged.`)
);
manager.on(MailboxManagerEvents.ticketClose, async (ticket, userTickets) => {
  console.log(`${ticket.id} got closed!`);

  // ticketClose feature
  const user = ticket.createdBy;
  const nbTickets = userTickets.length;
  await user.send(`The ticket ${ticket.id} has been closed due to inactivity or manually by the receiver or yourself.\nYou now have ${nbTickets} opened tickets left.`);
});
manager.on(MessageBasedMailboxManagerEvents.ticketForceClose, (ticket, user) =>
  console.log(`${user.username} forced closed ticket ${ticket.id}.`)
);
manager.on(MessageBasedMailboxManagerEvents.threadCreate, (ticket, thread) => {
  console.log(`${ticket.id} is happening in ${thread.name}`);
});

client.login('TOKEN');
