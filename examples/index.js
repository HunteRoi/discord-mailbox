const {
  Client,
  GatewayIntentBits,
  Partials,
  ButtonStyle,
  TextInputStyle,
  Collection,
} = require('discord.js');
const {
  InteractionBasedMailboxManager,
  MailboxManagerEvents,
} = require('../lib');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});
const manager = new InteractionBasedMailboxManager(client, {
  mailboxOptions: {
    closeTicketAfterInMilliseconds: 60000, // in milliseconds
    maxOngoingTicketsPerUser: 3,
    cronTime: '* * * * *', // run each minute
  },
  optionsPerGuild: new Collection([
    ['GUILD_ID', {
      mailboxChannel: 'TEXT_CHANNEL_ID',
      maxOnGoingTicketsPerUser: 2,
      modalOptions: {
        generateTitle: (guild) => `Ticket for ${guild.name}`,
        modalComponentsOptions: {
          placeholder: 'Write down your message here',
          label: 'Your message',
          style: TextInputStyle.Paragraph,
        },
      },
      loggingOptions: {
        generateFilename: (ticket) => `log-ticket-${ticket.id}.txt`,
        generateMessage: (ticket) =>
          `Logs for ticket ${ticket.id} - closed at ${new Date(ticket.closedAt)}`,
        generateLogEntry: (ticketContent) =>
          `[${new Date(ticketContent.createdTimestamp)}] ${
            ticketContent.author.username
          } | ${ticketContent.cleanContent}`,
        showSenderNames: true,
        logChannel: 'TEXT_CHANNEL_ID',
        sendInThread: true,
      },
      threadOptions: {
        generateName: (ticket) => `Ticket ${ticket.id}`,
        generateStartMessage: (ticket) => `New ticket created by ${ticket.createdBy}`,
      },
      embedOptions: {
        color: 12272523,
      },
      generateReplyMessage: (ticket, guild) => 'Please use the reply button to send an answer to this message.',
      generateMessageTitle: (ticket, guild) => `Ticket ${ticket.id} for ${guild.name} (${guild.id})`,
      generateClosedChannelName: (ticket, guild, thread) => `[Closed] ${thread?.name ?? ticket.id}`,
      generateTooMuchTicketsMessage: (user, guild) => 'You have too much tickets that are not closed! Please wait for your tickets to be closed before submitting new ones.',
      generateInteractionReplyMessage: (ticket, guild) => 'Your feedback has been received!',
      createButtonOptions: {
        label: 'CREATE TICKET',
        emoji: '➕',
        style: ButtonStyle.Primary,
      },
      replyButtonOptions: {
        label: 'REPLY',
        emoji: '↩️',
        style: ButtonStyle.Primary,
      },
      forceCloseButtonOptions: {
        label: 'CLOSE',
        emoji: '❌',
        style: ButtonStyle.Secondary,
      }
    }]
  ])
});

client.on('ready', () => console.log('Connected!'));
client.on('messageCreate', async (message) => {
  if (message.content === 'createTicket') {
    await manager.sendSelectGuildMenu(message.author);
  }
});

manager.on(MailboxManagerEvents.ticketCreate, async (ticket) => {
  console.log(`${ticket.id} has been created!`);

  // autoReplyMessage feature
  const user = ticket.createdBy;
  await user.send(
    'Your ticket has been received and will be treated soon. Please remain patient as we get back to you!'
  );
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
  await user.send(
    `The ticket ${ticket.id} has been closed due to inactivity or manually by the receiver or yourself.\nYou now have ${nbTickets} opened tickets left.`
  );
});
manager.on(MailboxManagerEvents.ticketForceClose, (ticket, user) =>
  console.log(`${user.username} forced closed ticket ${ticket.id}.`)
);
manager.on(MailboxManagerEvents.threadCreate, (ticket, thread) => {
  console.log(`${ticket.id} is happening in ${thread.name}`);
});

client.login('TOKEN');
