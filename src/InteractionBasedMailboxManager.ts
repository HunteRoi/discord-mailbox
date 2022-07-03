import { AllowedThreadTypeForTextChannel, BaseGuildTextChannel, ButtonInteraction, Client, Constants, GuildTextBasedChannel, Interaction, MessageActionRow, MessageButton, MessageEmbed, MessageOptions, Modal, ModalActionRowComponent, ModalSubmitInteraction, PartialTextBasedChannelFields, TextInputComponent, ThreadChannel } from "discord.js";
import ErrorMessages from "./ErrorMessages";

import { MailboxManager } from "./MailboxManager";
import { MailboxManagerEvents, MessageBasedMailboxManagerEvents } from "./MailboxManagerEvents";
import { createTicketContentFromInteraction, InteractionBasedMailboxManagerOptions, Ticket, UserTickets } from "./types";
import { arrowDown } from "./utils/constants";
import { isNullOrWhiteSpaces } from "./utils/StringUtils";

export class InteractionBasedMailboxManager extends MailboxManager {
    readonly createTicketId = 'create-ticket';
    readonly replyTicketIdPrefix = 'update-ticket-';
    readonly forceCloseTicketIdPrefix = 'force-close-ticket-';

    protected override readonly options!: InteractionBasedMailboxManagerOptions;

    constructor(client: Client, options: InteractionBasedMailboxManagerOptions) {
        super(client, options);

        this.client.on(Constants.Events.INTERACTION_CREATE, async (interaction: Interaction) => {
            try {
                if (interaction.isCommand() && interaction.commandName === this.options.openTicketCommandName) {
                    const button = new MessageButton({ ...this.options.startButtonOptions, customId: this.createTicketId });
                    await interaction.reply({
                        components: [
                            new MessageActionRow().addComponents(button)
                        ]
                    });
                }
                else if (interaction.isButton()) {
                    if (interaction.customId === this.createTicketId) {
                        this.onCreateButtonInteraction(interaction);
                    } else if (interaction.customId.includes(this.replyTicketIdPrefix)) {
                        this.onReplyButtonInteraction(interaction);
                    } else if (interaction.customId.includes(this.forceCloseTicketIdPrefix)) {
                        this.onForceCloseButtonInteraction(interaction);
                    }
                }
                else if (interaction.isModalSubmit()) {
                    if (interaction.customId.includes(this.createTicketId)) {
                        this.onNewTicketSubmitInteraction(interaction);
                    }
                    else if (interaction.customId.includes(this.replyTicketIdPrefix)) {
                        this.onReplySubmitInteraction(interaction);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        });
        this.on(MailboxManagerEvents.ticketLog, (ticket: Ticket) => this.handleLog(ticket));
    }

    checkTickets(): void {
        this.usersTickets.each((ut: UserTickets) => {
            ut.each((ticket: Ticket) => {
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
            await ticket.createdBy.send(logMessage);
        }

        if (this.options.loggingOptions.sendInThread && ticket.threadId !== null) {
            const thread = await this.client.channels.fetch(ticket.threadId) as ThreadChannel;
            await thread.send(logMessage);
            await this.updateThread(ticket);
        } else {
            const logChannel = typeof this.options.loggingOptions.channel === 'string'
                ? await this.client.channels.fetch(
                    this.options.loggingOptions.channel
                ) as GuildTextBasedChannel
                : this.options.loggingOptions.channel;
            await logChannel.send(logMessage);
        }
    }

    private async onCreateButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferReply();

        const modal = this.generateModal(interaction.customId);
        await interaction.showModal(modal);

        await interaction.editReply(this.options.interactionReply);
    }

    private async onReplyButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferReply();

        const ticketId = interaction.customId.replace(this.replyTicketIdPrefix, '');
        const ticket = this.getTicketById(ticketId);
        const modal = this.generateModal(interaction.customId, ticket);
        await interaction.showModal(modal);

        await interaction.editReply(this.options.interactionReply);
    }

    private async onForceCloseButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        const ticketId = interaction.customId.replace(this.forceCloseTicketIdPrefix, '');
        const ticket = this.getTicketById(ticketId);

        await this.updateThread(ticket);

        this.emit(MessageBasedMailboxManagerEvents.ticketForceClose, ticket, interaction.user);
        this.closeTicket(ticket.id);

        await interaction.reply(this.options.interactionReply);
    }

    private async onNewTicketSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
        const ticketContent = createTicketContentFromInteraction(interaction);
        const ticket = this.createTicket(ticketContent);

        const channel = await this.getChannel(ticket);
        const ticketMessage = this.generateMessageFromTicket(ticket);
        await channel.send(ticketMessage);

        await interaction.reply(this.options.interactionReply);
    }

    private async onReplySubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
        const ticketContent = createTicketContentFromInteraction(interaction);
        const ticketId = interaction.customId.replace(this.replyTicketIdPrefix, '');
        const ticket = this.getTicketById(ticketId);

        this.replyToTicket(ticketContent, ticket.id);

        const ticketMessage = this.generateMessageFromTicket(ticket);
        const isSentToAdmin = interaction.channel?.type === Constants.ChannelTypes[Constants.ChannelTypes.DM];
        const channel = await this.getChannel(ticket);
        const answerMessage = await (isSentToAdmin ? channel : ticket.createdBy).send(ticketMessage);

        await interaction.reply(this.options.interactionReply);
        this.emit(MessageBasedMailboxManagerEvents.replySent, interaction, answerMessage);
    }

    private async getChannel(ticket: Ticket): Promise<PartialTextBasedChannelFields> {
        const guildChannel = typeof this.options.mailboxChannel === 'string'
            ? await this.client.channels.fetch(this.options.mailboxChannel) as BaseGuildTextChannel
            : this.options.mailboxChannel;
        let thread: ThreadChannel | null = null;
        if (!ticket.threadId && this.options.threadOptions && guildChannel.type !== Constants.ChannelTypes[Constants.ChannelTypes.GUILD_VOICE]) {
            const startMessage = await guildChannel.send(this.options.threadOptions.startMessage(ticket));
            thread = await (guildChannel as BaseGuildTextChannel).threads.create({
                name: this.options.threadOptions.name(ticket),
                autoArchiveDuration: 'MAX',
                startMessage,
                type: Constants.ChannelTypes[Constants.ChannelTypes.GUILD_PUBLIC_THREAD] as AllowedThreadTypeForTextChannel,
            });
            ticket.setChannel(thread.id);
            this.emit(MessageBasedMailboxManagerEvents.threadCreate, ticket, thread);
        } else if (ticket.threadId) {
            thread = await (guildChannel as BaseGuildTextChannel).threads.fetch(ticket.threadId);
        }

        return thread ?? guildChannel;
    }

    private generateMessageFromTicket(ticket: Ticket): MessageOptions {
        const isSentToAdmin = ticket.lastMessage.channel?.type === Constants.ChannelTypes[Constants.ChannelTypes.DM]
            || ticket.lastMessage.channel?.type === Constants.ChannelTypes[Constants.ChannelTypes.GROUP_DM];

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

        const replyButton = new MessageButton({ ...this.options.replyButtonOptions, customId: `${this.replyTicketIdPrefix}${ticket.id}` });
        const row = new MessageActionRow().addComponents(replyButton);
        if (this.options.forceCloseEmoji) {
            const forceCloseButton = new MessageButton({
                ...this.options.forceCloseButtonOptions,
                emoji: this.options.forceCloseEmoji,
                customId: `${this.forceCloseTicketIdPrefix}${ticket.id}`
            });
            row.addComponents(forceCloseButton);
        }

        return this.options.embedOptions
            ? {
                embeds: [
                    new MessageEmbed(this.options.embedOptions)
                        .setAuthor({ name: header, iconURL: isSentToAdmin ? arrowDown : '' })
                        .setDescription(description)
                        .setFooter({ text: footer })
                        .setTimestamp()
                ],
                components: [row]
            } as MessageOptions
            : {
                content: `${header}\n\n​${description}\n\n​${footer}`,
                components: [row]
            };
    }

    private generateModal(customId: string, ticket?: Ticket): Modal {
        const messageRow = new MessageActionRow<ModalActionRowComponent>()
            .addComponents(
                new TextInputComponent({ ...this.options.modalOptions.modalComponentsOptions, required: true, customId: 'message' })
            );
        // TODO: add an attachment component https://github.com/discord/discord-api-docs/discussions/4482
        const modal = new Modal()
            .setCustomId(customId)
            .addComponents(messageRow);

        if (ticket) modal.setTitle(this.options.formatTitle(ticket));
        else modal.setTitle(this.options.modalOptions.title);

        return modal;
    }

    private async updateThread(ticket: Ticket): Promise<void> {
        if (ticket.threadId) {
            const thread = await this.client.channels.fetch(ticket.threadId) as ThreadChannel;
            await thread.setName(`${this.options.closedChannelPrefix ?? ''}${thread.name}`);
            await thread.setArchived(true);
        }
    }
}