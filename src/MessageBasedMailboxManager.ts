import { Client, Constants, BaseGuildTextChannel, Message, MessageReaction, PartialMessage, PartialMessageReaction, PartialUser, ThreadChannel, User, AllowedThreadTypeForTextChannel, MessageEmbed, MessageOptions, Snowflake, GuildTextBasedChannel } from "discord.js";

import { MailboxManager } from "./MailboxManager";
import { MailboxManagerEvents, MessageBasedMailboxManagerEvents } from "./MailboxManagerEvents";
import { MessageBasedMailboxManagerOptions, Ticket, TicketContent, UserTickets } from "./types";
import { isNullOrWhiteSpaces } from "./utils/StringUtils";
import { arrowDown, arrowUp } from "./utils/constants";
import ErrorMessages from "./ErrorMessages";

export class MessageBasedMailboxManager extends MailboxManager {
    protected override readonly options!: MessageBasedMailboxManagerOptions;

    constructor(client: Client, options: MessageBasedMailboxManagerOptions) {
        super(client, options);

        this.client.on(Constants.Events.MESSAGE_CREATE, async (message: Message | PartialMessage) => {
            try {
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
            } catch (error) {
                console.error(error);

                const err = error as Error;
                if (err.message == ErrorMessages.tooMuchTicketsOpened && this.options.tooMuchTickets) {
                    await message.reply(this.options.tooMuchTickets);
                }
            }
        });

        this.client.on(Constants.Events.MESSAGE_REACTION_ADD, async (messageReaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
            try {
                const msgReaction = messageReaction.partial ? await messageReaction.fetch() : messageReaction as MessageReaction;
                const usr = user.partial ? await user.fetch(true) : user as User;
                if (usr.bot) return;

                await this.onReactionAdd(msgReaction, usr);
            } catch (error) {
                console.error(error);
            }
        });

        this.on(MailboxManagerEvents.ticketLog, (ticket: Ticket) => {
            try {
                this.handleLog(ticket);
            } catch (error) {
                console.error(error);
            }
        });
    }

    checkTickets(): void {
        this.usersTickets.each((userTickets: UserTickets) => {
            userTickets.each(async (ticket: Ticket) => {
                if (ticket.isOutdated(this.options.closeTicketAfterInMilliseconds)) {
                    this.updateThread(ticket);

                    this.closeTicket(ticket.id);
                }
            });
        });
    }

    private async handleLog(ticket: Ticket): Promise<void> {
        if (!this.options.loggingOptions) return;

        const logs = ticket.messages.map(this.options.loggingOptions.generateLogEntry);
        if (logs.length > 0 && !this.options.loggingOptions.showSenderNames && logs[0].includes(ticket.messages[0].author.username)) {
            throw new Error(ErrorMessages.senderNamesAppear);
        }

        const content = this.options.loggingOptions.generateMessage(ticket);
        const logMessage = typeof content === 'string'
            ? {
                content,
                files: [
                    {
                        attachment: Buffer.from(logs.join('\n')),
                        name: this.options.loggingOptions.generateFilename(ticket),
                    },
                ],
            } as MessageOptions
            : {
                ...content, files: [{
                    attachment: Buffer.from(logs.join('\n')),
                    name: this.options.loggingOptions.generateFilename(ticket)
                }]
            };

        if (this.options.loggingOptions.sendToRecipient) {
            const user = await this.client.users.fetch(ticket.createdBy);
            await user.send(logMessage);
        }

        if (this.options.loggingOptions.sendInThread && ticket.channelId !== null) {
            const thread = await this.client.channels.fetch(ticket.channelId) as ThreadChannel;
            await thread.send(logMessage);
        } else {
            const logChannel = typeof this.options.loggingOptions.channel === 'string'
                ? await this.client.channels.fetch(
                    this.options.loggingOptions.channel
                ) as GuildTextBasedChannel
                : this.options.loggingOptions.channel;
            await logChannel.send(logMessage);
        }
    }

    private async onDMCreate(message: Message): Promise<void> {
        let ticket: Ticket | undefined;

        if (message.reference && message.reference.messageId) {
            const previousMessage = await message.channel.messages.fetch(message.reference.messageId);
            const lastMessageId = this.extractMessageId(previousMessage);
            if (!lastMessageId) throw new Error(ErrorMessages.noPreviousMessageId);

            const userTickets = this.usersTickets.find((userTickets: UserTickets) => userTickets.some((ticket: Ticket) => ticket.lastMessage.id === lastMessageId));
            ticket = userTickets?.find((ticket: Ticket) => ticket.lastMessage.id === lastMessageId);
        }

        const guildChannel = typeof this.options.mailboxChannel === 'string'
            ? await this.client.channels.fetch(this.options.mailboxChannel) as BaseGuildTextChannel
            : this.options.mailboxChannel;
        let thread: ThreadChannel | null = null;
        if (ticket) {
            this.replyToTicket(message as TicketContent, ticket.id);

            if (this.options.threadOptions && guildChannel.type !== Constants.ChannelTypes[Constants.ChannelTypes.GUILD_VOICE] && ticket.channelId !== null) {
                thread = await this.client.channels.fetch(ticket.channelId) as ThreadChannel;
            }
        } else {
            ticket = this.createTicket(message);

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
        }

        const ticketMessage = this.generateMessageFromTicket(ticket);
        const answerMessage = await (thread ?? guildChannel).send(ticketMessage);

        if (this.options.forceCloseEmoji) {
            await answerMessage.react(this.options.forceCloseEmoji);
        }
    }

    private async onGuildReply(message: Message): Promise<void> {
        if (!message.reference || !message.reference.messageId) throw new Error(ErrorMessages.messageIsNotReply);
        const previousMessage = await message.channel.messages.fetch(message.reference.messageId);
        const lastMessageId = this.extractMessageId(previousMessage);
        if (!lastMessageId) throw new Error(ErrorMessages.noPreviousMessageId);

        const userTickets = this.usersTickets.find((userTickets: UserTickets) => userTickets.some((ticket: Ticket) => ticket.lastMessage.id === lastMessageId));
        const ticket = userTickets?.find((ticket: Ticket) => ticket.lastMessage.id === lastMessageId);
        if (!ticket) throw new Error(ErrorMessages.messageHasNoTicket);

        this.replyToTicket(message as TicketContent, ticket.id);

        const embed = previousMessage.embeds && previousMessage.embeds.length > 0 ? previousMessage.embeds[0] : null;
        if (embed) {
            embed.setAuthor({ name: embed.author?.name ?? this.client.user?.username ?? 'Unknown', iconURL: arrowUp });
            await previousMessage.edit({
                content: previousMessage.content || null,
                embeds: [embed],
            });
        }

        if (this.options.replySentEmoji) {
            await previousMessage.reactions.removeAll();
            await previousMessage.react(this.options.replySentEmoji);
        }

        const ticketMessage = this.generateMessageFromTicket(ticket);
        const answerMessage = await ticket.createdBy.send(ticketMessage);

        if (this.options.forceCloseEmoji) {
            await answerMessage.react(this.options.forceCloseEmoji);
        }

        this.emit(MessageBasedMailboxManagerEvents.replySent, message, answerMessage);
    }

    private extractMessageId(message: Message<boolean> | PartialMessage): Snowflake | null | undefined {
        let messageId: Snowflake | null | undefined;
        if (this.options.embedOptions && message.embeds) {
            messageId = message.embeds[0]?.footer?.text?.replace('ID: ', '');
        } else {
            const footer = message.content?.split('\n\n​')?.pop();
            messageId = footer?.replace('ID: ', '');
        }
        return messageId;
    }

    private generateMessageFromTicket(ticket: Ticket): string | MessageOptions {
        const isSentToAdmin = ticket.lastMessage.channel.type === Constants.ChannelTypes[Constants.ChannelTypes.DM]
            || ticket.lastMessage.channel.type === Constants.ChannelTypes[Constants.ChannelTypes.GROUP_DM];

        const header = this.options.formatTitle(ticket);
        if (isNullOrWhiteSpaces(header) || !header.includes(ticket.id)) {
            throw new Error(ErrorMessages.headerMustContainTicketId);
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

    private async onReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
        if (reaction.emoji.name !== this.options.forceCloseEmoji) {
            throw new Error(ErrorMessages.notForceCloseEmoji);
        }

        const botMessage = reaction.message;
        const lastMessageId = this.extractMessageId(botMessage);
        if (!lastMessageId) throw new Error(ErrorMessages.noPreviousMessageId);

        const userTickets = this.usersTickets.find((userTickets: UserTickets) => userTickets.some((ticket: Ticket) => ticket.lastMessage.id === lastMessageId));
        const ticket = userTickets?.find((ticket: Ticket) => ticket.lastMessage.id === lastMessageId);
        if (!ticket) throw new Error(ErrorMessages.messageHasNoTicket);

        const embeds = botMessage.embeds;
        const embed = embeds && embeds.length > 0 ? embeds[0] : null;
        if (embed) {
            embed.setAuthor({ name: embed.author?.name ?? this.client.user?.username ?? 'Unknown', iconURL: arrowUp });
            embeds.splice(0, 1, embed);
            await botMessage.edit({
                content: botMessage.content || null,
                embeds
            });
        }
        this.updateThread(ticket);

        this.emit(MessageBasedMailboxManagerEvents.ticketForceClose, ticket, user);
        this.closeTicket(ticket.id);
    }

    private async updateThread(ticket: Ticket): Promise<void> {
        if (ticket.channelId) {
            const thread = await this.client.channels.fetch(ticket.channelId) as ThreadChannel;
            await thread.setName(`${this.options.closedChannelPrefix ?? ''}${thread.name}`);
            await thread.setArchived(true);
        }
    }
}