<a href="https://www.npmjs.com/package/@hunteroi/discord-mailbox"><img src="https://badge.fury.io/js/%40hunteroi%2Fdiscord-mailbox.svg" alt="npm version" height="18"></a>

# Discord Mailbox

Discord Mailbox is a framework to easily add a mailbox inside your bot. The feature is also fully customizable.

- Supports multiple tickets per users
- Logs everything like you want it
- Emits events like `ticketCreate`, `ticketUpdate` and **6 more**
- Allow full customization of the embed (you can add image, thumbnail, etc)
- And much more!

![IMAGE](./assets/example.gif)

## Prerequisites ⚠️

Starting at **v2.0.0**, you must use **NodeJS v16.6.0 or higher** to run a bot with this library.

You also must not forget to include [mandatory intents and partials](#mandatory-intents-and-partials) as well as give your bot the rights to read messages.

### Mandatory intents and partials

- GUILDS: used to access guild content such as channels.
- GUILD_MESSAGES: used to read guild messages.
- GUILD_MESSAGE_REACTIONS: used to access guild messages reactions.
- DIRECT_MESSAGES: used to access direct messages to the bot.
- CHANNEL: used to receive events when the bot is DMed.
- MESSAGE: used to read the messages even if incomplete.

## Installation

```sh
npm install --save @hunteroi/discord-mailbox
```

## Examples

See [./example/index.js](example/index.js).

## Events

```ts
manager.on(MailboxManagerEvents.ticketCreate, (ticket: Ticket) => {});

manager.on(MailboxManagerEvents.ticketUpdate, (ticket: Ticket) => {});

manager.on(MailboxManagerEvents.ticketLog, (ticket: Ticket) => {});

manager.on(MailboxManagerEvents.ticketClose, (ticket: Ticket) => {});

manager.on(
	MailboxManagerEvents.ticketForceClose,
	(ticket: Ticket, user: User | PartialUser) => {}
);

manager.on(MailboxManagerEvents.ticketDelete, (ticket: Ticket) => {});

manager.on(
	MailboxManagerEvents.replySent,
	(message: Message, answer: Message) => {}
);

manager.on(MailboxManagerEvents.replyDelete, (message: Message) => {});

manager.on(
	MailboxManagerEvents.threadCreate,
	(ticket: Ticket, thread: ThreadChannel) => {}
);

manager.on(
	MailboxManagerEvents.threadArchive,
	(ticket: Ticket, thread: ThreadChannel) => {}
);
```

## Contribution

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your Branch: `git checkout -b patch/YourAmazingWork`
3. Commit your Changes: `git commit -m 'Add some amazing work'`
4. Push to the Branch: `git push origin patch/YourAmazingWork`
5. Open a Pull Request

## Todo

- auto reply when a ticket is opened
- support thread
