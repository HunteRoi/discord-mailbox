import { Client, Constants, BaseGuildTextChannel, Message, MessageReaction, PartialMessage, PartialMessageReaction, PartialUser, ThreadChannel, User, AllowedThreadTypeForTextChannel, MessageEmbed, MessageOptions, Snowflake, GuildTextBasedChannel } from "discord.js";

import { MailboxManager } from "./MailboxManager";
import { MailboxManagerEvents, MessageBasedMailboxManagerEvents } from "./MailboxManagerEvents";
import { MessageBasedMailboxManagerOptions, Ticket, TicketContent, UserTickets } from "./types";
import { isNullOrWhiteSpaces } from "./utils/StringUtils";
import { arrowDown, arrowUp } from "./utils/constants";

export class MessageBasedMailboxManager extends MailboxManager {
    protected options: MessageBasedMailboxManagerOptions;

    constructor(client: Client, options: MessageBasedMailboxManagerOptions) {
        super(client, options);

        this.client.on(Constants.Events.MESSAGE_CREATE, async (message: Message | PartialMessage) => {
            const msg = message.partial ? await message.fetch(true) : message as Message;
            if (msg.author.bot) return;

            switch (message.channel.type) {
                case Constants.ChannelTypes[Constants.ChannelTypes.GROUP_DM]:
                case Constants.ChannelTypes[Constants.ChannelTypes.DM]:
                    await this.onDMCreate(msg);
                    break;

                case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_TEXT]:
                case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_VOICE]:
                case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_PRIVATE_THREAD]:
                case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_PUBLIC_THREAD]:
                    await this.onGuildReply(msg);
                    break;

                default: throw new Error("Unsupported type of message's channel.");
            }
        });

        this.client.on(Constants.Events.MESSAGE_REACTION_ADD, async (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
            const msgReaction = messageReaction.partial ? await messageReaction.fetch() : messageReaction as MessageReaction;
            const usr = user.partial ? await user.fetch(true) : user as User;
            if (usr.bot) return;

            await this.onReactionAdd(msgReaction, usr);
        });

        this.on(MailboxManagerEvents.ticketLog, (ticket: Ticket) => this.handleLog(ticket));
    }

    private async handleLog(ticket: Ticket) {
        if (!this.options.loggingOptions) return;

        const logs = ticket.messages.map(this.options.loggingOptions.generateLogEntry);
        const content = this.options.loggingOptions.generateMessage(ticket);
        const logMessage = typeof content === 'string'
            ? {
                content,
                files: [
                    {
                        attachment: Buffer.from(logs.join('\n')),
                        name: this.options.loggingOptions.generateFileName(ticket),
                    },
                ],
            } as MessageOptions
            : {
                ...content, files: [{
                    attachment: Buffer.from(logs.join('\n')),
                    name: this.options.loggingOptions.generateFileName(ticket)
                }]
            };

        const user = await this.client.users.fetch(ticket.createdBy);
        await user.send(logMessage);

        const logChannel = typeof this.options.loggingOptions.logChannel === 'string'
            ? await this.client.channels.fetch(
                this.options.loggingOptions.logChannel
            ) as GuildTextBasedChannel
            : this.options.loggingOptions.logChannel;
        await logChannel.send(logMessage);
    }

    private async onDMCreate(message: Message) {
        const guildChannel = typeof this.options.mailboxChannel === 'string'
            ? await this.client.channels.fetch(this.options.mailboxChannel) as BaseGuildTextChannel
            : this.options.mailboxChannel;
        const ticket = this.createTicket(message);

        let thread: ThreadChannel | null = null;
        if (this.options.threadOptions && guildChannel.type !== Constants.ChannelTypes[Constants.ChannelTypes.GUILD_VOICE]) {
            const startMessage = await guildChannel.send(this.options.threadOptions.startMessage(ticket));
            thread = await (guildChannel as BaseGuildTextChannel).threads.create({
                name: this.options.threadOptions.name(ticket),
                autoArchiveDuration: 'MAX',
                startMessage,
                type: Constants.ChannelTypes[Constants.ChannelTypes.GUILD_PUBLIC_THREAD] as AllowedThreadTypeForTextChannel,
            });
            ticket.setChannel(thread.id);
            this.emit(MessageBasedMailboxManagerEvents.threadCreate, ticket, thread);
        }

        const ticketMessage = this.generateMessageFromTicket(ticket);
        const answerMessage = await (thread ?? guildChannel).send(ticketMessage);

        if (this.options.forceCloseEmoji) {
            await answerMessage.react(this.options.forceCloseEmoji);
        }
    }

    private generateMessageFromTicket(ticket: Ticket): string | MessageOptions {
        const isSentToAdmin = ticket.lastMessage.channel.type === Constants.ChannelTypes[Constants.ChannelTypes.DM]
            || ticket.lastMessage.channel.type === Constants.ChannelTypes[Constants.ChannelTypes.GROUP_DM];

        const header = this.options.formatTitle(ticket);
        if (isNullOrWhiteSpaces(header) || !header.includes(ticket.id)) {
            throw new Error('Ticket title must at least contain the ticket id');
        }
        const prefix = isSentToAdmin || this.options.loggingOptions?.showSenderNames
            ? `${ticket.lastMessage.author.username}:\n`
            : null;
        const suffix = `\n\n**${this.options.replyMessage}**`;
        const description = `${!isNullOrWhiteSpaces(prefix) ? prefix : ''}${ticket.lastMessage.cleanContent}${!isNullOrWhiteSpaces(suffix) ? suffix : ''}`;

        const footer = `ID: ${ticket.lastMessage.id}`;

        return this.options.embedOptions
            ? {
                embeds: [
                    new MessageEmbed(this.options.embedOptions)
                        .setAuthor({ name: header, iconURL: isSentToAdmin ? arrowDown : '' })
                        .setDescription(description)
                        .setFooter({ text: footer })
                        .setTimestamp()
                ]
            } as MessageOptions
            : `${header}\n\n​${description}\n\n​${footer}`;
    }

    private async onGuildReply(message: Message) {
        if (!message.reference) throw new Error('Message is not a reply.');
        const previousMessage = await message.channel.messages.fetch(message.reference.messageId);
        const lastMessageId = this.extractMessageId(previousMessage);
        if (!lastMessageId) throw new Error('Previous message does not contain message ID.');

        const userTickets = this.usersTickets.find((userTickets: UserTickets) => userTickets.some((ticket: Ticket) => ticket.lastMessage.id === lastMessageId));
        const ticket = userTickets?.find((ticket: Ticket) => ticket.lastMessage.id === lastMessageId);
        if (!ticket) throw new Error('There are no ticket related to this message.');

        const guildChannel = typeof this.options.mailboxChannel === 'string'
            ? await this.client.channels.fetch(this.options.mailboxChannel) as BaseGuildTextChannel
            : this.options.mailboxChannel;
        let thread: ThreadChannel | null = null;
        if (guildChannel.id !== ticket.channelId) {
            thread = await (guildChannel as BaseGuildTextChannel).threads.fetch(ticket.channelId);
        }

        const embed = previousMessage.embeds && previousMessage.embeds[0];
        if (embed) {
            embed.setAuthor({ name: embed.author.name, iconURL: arrowUp });
            await previousMessage.edit({
                content: previousMessage.content || null,
                embeds: [embed],
            });
        }

        if (this.options.replySentEmoji) {
            await previousMessage.reactions.removeAll();
            await previousMessage.react(this.options.replySentEmoji);
        }


        if (this.options.deleteReplies) {
            await message.delete();
            this.emit(MessageBasedMailboxManagerEvents.replyDelete, message);
        }

        const ticketMessage = this.generateMessageFromTicket(ticket);
        const answerMessage = await (thread ?? guildChannel).send(ticketMessage);
        this.emit(MessageBasedMailboxManagerEvents.replySent, message, answerMessage);
    }

    private extractMessageId(ticketContent: TicketContent): Snowflake {
        let messageId: Snowflake;
        if (this.options.embedOptions) {
            messageId = ticketContent.embeds[0].footer.text.replace('ID: ', '');
        } else {
            const footer = ticketContent.content.split('\n\n​').pop();
            messageId = footer.replace('ID: ', '');
        }
        return messageId;
    }

    private async onReactionAdd(reaction: MessageReaction, user: User) {
        if (reaction.emoji.name !== this.options.forceCloseEmoji) {
            throw new Error('Reaction emoji is not for force close.');
        }

        const botMessage = reaction.message;
        const lastMessageId = this.extractMessageId(botMessage);
        if (!lastMessageId) throw new Error('Previous message does not contain message ID.');

        const userTickets = this.usersTickets.find((userTickets: UserTickets) => userTickets.some((ticket: Ticket) => ticket.lastMessage.id === lastMessageId));
        const ticket = userTickets?.find((ticket: Ticket) => ticket.lastMessage.id === lastMessageId);
        if (!ticket) throw new Error('There are no ticket related to this message.');

        const guildChannel = typeof this.options.mailboxChannel === 'string'
            ? await this.client.channels.fetch(this.options.mailboxChannel) as BaseGuildTextChannel
            : this.options.mailboxChannel;
        let thread: ThreadChannel | null = null;
        if (guildChannel.id !== ticket.channelId) {
            thread = await (guildChannel as BaseGuildTextChannel).threads.fetch(ticket.channelId);
        }

        const embed = botMessage.embeds && botMessage.embeds[0];
        if (embed) {
            embed.setAuthor({ name: embed.author.name, iconURL: arrowUp });
            await botMessage.edit({
                content: botMessage.content || null,
                embeds: [embed],
            });
        }
        this.emit(MessageBasedMailboxManagerEvents.ticketForceClose, ticket, user);

        this.closeTicket(ticket.id);
    }
}