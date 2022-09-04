# Breaking Changes

## Support for Discord.js v14

The entire library has been ported to djs v14.

## MailboxManager class

The mailbox manager becomes a real tickets manager. It now only handles user tickets.

## Format Title parameter

The `options#formatTitle` method does not take the id as a parameter anymore, but directly relies on a [Ticket](./src/types/Ticket.ts) instance.

```ts
// before
function formatTitle(id: string): string {
    return `Ticket ${id}`;
}

// after
function formatTitle(ticket: Ticket, guild: Guild): string {
    return `Ticket ${ticket.id} - ${guild.name}`;
}
```

## ticketDelete event disappears

This event was initially created to let the user know a ticket has been internally deleted but this information should not be shared outside the system through a different event than `ticketClose`.
It has thus been removed.

## loggingOptions#format Changes

The format function supposed to format each message of a ticket has changed. The whole signature actually got updated:
```ts
// before

loggingOptions: {
    ...
    format: (message: Message) => `${message.author.username} sent: ${message.cleanContent}`,
    ...
}

// after
loggingOptions: {
    ...
    generateLogEntry: (ticketContent: TicketContent) => `${ticketContent.author.username} sent: ${ticketContent.cleanContent}`,
    ...
}
```

## loggingOptions#showNames Rename

The `showName` property of the logging options has been renamed to `showSenderNames` for more clarity on its meaning.

## options#closeTicketAfter Unit Change

The `closeTicketAfter` was initially in seconds. It is now in milliseconds.

## options#closeTicketAfter Rename

The `closeTicketAfter` property of the options has been renamed to `closeTicketAfterInMilliseconds` for more clarity on its unit.

## options#notAllowedToPing Removal

The `notAllowedToPing` property of the options has been removed. You should handle this using your client's options (property is called `allowedMentions`).

## options#autoReplyMessage Removal

The `autoReplyMessage` property of the options has been removed. You should use `ticketCreate` event to handle such side-effect.

## options#replyMessageInFooter Removal

The `replyMessageInFooter` property of the options has been removed. The footer is forced.

## options#ticketClose Removal

The `ticketClose` property of the options has been removed. You should use `ticketClose` event to handle such side-effect.

## embedOptions#send Removal

The `send` property of the embed options has been removed. Once an EmbedOptions object is found, the embed feature is used instead of standard messages.

## options#deleteReplies Removal

The `deleteReplies` property of the options has been removed. It actually is misleading to end users (staff members responding to messages).
If you want to still use it, you can perform the same action through the `replySent` event.

## replyDelete event disappears

This event was initially created to let the user know a replt has been deleted but the deletion behaviour has ben removed so thus event has no purpose anymore.
It has thus been removed.

## options#sendToRecipient Removal

The `sendToRecipient` property of the options has been removed. Indeed, users have the fundamental right to receive and keep a copy of the conversation with anyone.

## options#mailboxChannel Removal

The `mailboxChannel` property has been removed in profit of a `mailboxChannels` property to enable the management of several guilds by a single manager.

## options#loggingOptions#channel Removal

The `channel` property of the `loggingOptions` property has been removed in profit of a `channels` property to enable the management of several guilds by a single manager.

