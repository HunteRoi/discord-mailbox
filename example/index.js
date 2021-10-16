const { Client, Intents } = require('discord.js');

const { MailboxManager, MailboxManagerEvents } = require('../lib');

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.DIRECT_MESSAGES,
	],
});
const manager = new MailboxManager(client, {
	forceCloseEmoji: '❌',
	replySentEmoji: '📤',
	loggingOptions: {
		generateFilename: (ticket) => `log-ticket-${ticket.id}.txt`,
		format: (msg) =>
			`[${new Date(msg.createdTimestamp)}] ${msg.author.username} | ${
				msg.cleanContent
			}`,
		generateMessage: (ticket) =>
			`Logs for ticket ${ticket.id} - closed at ${new Date(
				ticket.closedAt
			)}`,
		sendToRecipient: false,
		channel: 'TEXT_CHANNEL_ID',
		showName: false,
	},
	mailboxChannel: 'TEXT_CHANNEL_ID',
	deleteReplies: true,
	cronTime: '* * * * *', // run each minute
	closeTicketAfter: 60, // in seconds
	maxOngoingTicketsPerUser: 3,
	notAllowedToPing:
		'You are not allowed to mention @everyone or @here in a mail!',
	replyMessage:
		'Please use the "reply" feature to send an answer to this message.',
	tooMuchTickets:
		'You have too much tickets that are not closed! Please wait for your tickets to be closed before submitting new ones.',
	ticketClose: (nbTickets) =>
		`This ticket has been closed due to inactivity or manually by the receiver. You now have ${nbTickets} tickets left opened.`,
	replyMessageInFooter: true,
	embedOptions: {
		send: true,
		color: 12272523,
	},
	formatTitle: (id) => `[Ticket] ${id}`,
});

client.on('ready', () => console.log('Connected!'));

client.on('messageCreate', (message) => {
	console.log(message);
	if (message.content === 'show me the tickets collection') {
		message.reply(
			`\`\`\`js\n${JSON.stringify(manager.userTickets, null, 2)}\n\`\`\``
		);
	}
});

manager.on(MailboxManagerEvents.ticketCreate, (ticket) =>
	console.log(`${ticket.id} has been created!`)
);
manager.on(MailboxManagerEvents.ticketUpdate, (ticket) =>
	console.log(`${ticket.id} has been updated with a new message.`)
);
manager.on(MailboxManagerEvents.ticketLog, (ticket) =>
	console.log(`${ticket.id} got logged.`)
);
manager.on(MailboxManagerEvents.ticketClose, (ticket) =>
	console.log(`${ticket.id} got closed!`)
);
manager.on(MailboxManagerEvents.ticketForceClose, (ticket, user) =>
	console.log(`${user.username} forced closed ticket ${ticket.id}.`)
);
manager.on(MailboxManagerEvents.ticketDelete, (ticket) =>
	console.log(`${ticket.id} got deleted.`)
);

client.login('TOKEN');
