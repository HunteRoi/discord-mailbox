import {
  BaseGuildTextChannel,
  ButtonInteraction,
  Client,
  GuildTextBasedChannel,
  Interaction,
  MessageOptions,
  ModalSubmitInteraction,
  PartialTextBasedChannelFields,
  TextInputBuilder,
  ThreadChannel,
  User,
  ActionRowBuilder,
  SelectMenuBuilder,
  ButtonBuilder,
  ModalBuilder,
  EmbedBuilder,
  Events,
  Guild,
  ChannelType,
  ThreadAutoArchiveDuration,
  ModalActionRowComponentBuilder,
  CacheType,
  SelectMenuInteraction,
} from 'discord.js';
import ErrorMessages from './ErrorMessages';
import { MailboxManager } from './MailboxManager';
import { MailboxManagerEvents } from './MailboxManagerEvents';
import {
  createTicketContentFromInteraction,
  InteractionBasedMailboxManagerOptions,
  Ticket,
  UserTickets,
} from './types';
import { arrowDown } from './utils/constants';
import { isNullOrWhiteSpaces, truncate } from './utils/StringUtils';

/**
 * A mailbox working on interactions.
 *
 * @export
 * @class InteractionBasedMailboxManager
 * @extends {MailboxManager}
 */
export class InteractionBasedMailboxManager extends MailboxManager {
  readonly #selectGuild = 'sg';
  readonly #createTicketId = 'ct-';
  readonly #replyTicketIdPrefix = 'ut-';
  readonly #forceCloseTicketIdPrefix = 'fct-';

  /**
   * The options of the interactions manager.
   *
   * @protected
   * @memberof InteractionBasedMailboxManager
   */
  protected override readonly options!: InteractionBasedMailboxManagerOptions;

  /**
   * Creates an instance of InteractionBasedMailboxManager.
   * @param {Client} client
   * @param {InteractionBasedMailboxManagerOptions} options
   * @memberof InteractionBasedMailboxManager
   */
  constructor(client: Client, options: InteractionBasedMailboxManagerOptions) {
    super(client, options);

    this.client.on(
      Events.InteractionCreate,
      async (interaction: Interaction) => {
        try {
          if (interaction.isButton()) {
            if (interaction.customId.startsWith(this.#createTicketId))
              await this.#onCreateButtonInteraction(interaction);
            else if (interaction.customId.startsWith(this.#replyTicketIdPrefix))
              await this.#onReplyButtonInteraction(interaction);
            else if (
              interaction.customId.startsWith(this.#forceCloseTicketIdPrefix)
            )
              await this.#onForceCloseButtonInteraction(interaction);
          } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith(this.#createTicketId))
              await this.#onNewTicketSubmitInteraction(interaction);
            else if (interaction.customId.startsWith(this.#replyTicketIdPrefix))
              await this.#onReplySubmitInteraction(interaction);
          } else if (
            interaction.isSelectMenu() &&
            interaction.customId === this.#selectGuild
          )
            await this.#onGuildChoiceInteraction(interaction);
        } catch (error) {
          console.debug(error);
          if (
            (interaction.isMessageComponent() || interaction.isModalSubmit()) &&
            !interaction.replied
          ) {
            if (interaction.deferred)
              await interaction.editReply(
                `Action not possible: ${(error as any).message}`
              );
            else
              await interaction.reply(
                `Action not possible: ${(error as any).message}`
              );
          }
        }
      }
    );

    this.on(MailboxManagerEvents.ticketLog, async (ticket: Ticket) => {
      try {
        await this.#handleLog(ticket);
      } catch (error) {
        console.debug(error);
      }
    });
  }

  /** @inherit */
  checkTickets(): void {
    this.usersTickets
      .flatMap((ut: UserTickets) => ut)
      .each(async (ticket: Ticket) => {
        if (ticket.isOutdated(this.options.closeTicketAfterInMilliseconds)) {
          this.#updateThread(ticket);
          this.closeTicket(ticket.id);
        }
      });
  }

  /**
   * Sends the select menu to choose a guild.
   *
   * @param {User} user
   * @return {*}  {Promise<void>}
   * @memberof InteractionBasedMailboxManager
   */
  public async sendSelectGuildMenu(user: User): Promise<void> {
    const userGuilds = (
      await Promise.all(
        this.client.guilds.cache.map(async (guild: Guild) =>
          guild.members.cache.has(user.id) ||
          (await guild.members.fetch(user.id)) !== null
            ? guild
            : null
        )
      )
    ).filter(
      (guild): guild is Guild =>
        guild instanceof Guild && this.options.mailboxChannels.has(guild.id)
    );

    const rowSelectMenu =
      new ActionRowBuilder<SelectMenuBuilder>().addComponents(
        new SelectMenuBuilder(this.options.selectGuildOptions)
          .setCustomId(this.#selectGuild)
          .setOptions(
            userGuilds.map((g) => ({
              label: g.name,
              value: g.id,
              description: g.description
                ? truncate(g.description, 100)
                : undefined,
            }))
          )
      );
    await user.send({
      components: [rowSelectMenu],
    });
  }

  /**
   * Sends the start button to create a ticket.
   *
   * @param {SelectMenuInteraction<CacheType>} interaction
   * @return {*}  {Promise<void>}
   * @memberof InteractionBasedMailboxManager
   */
  async #onGuildChoiceInteraction(
    interaction: SelectMenuInteraction<CacheType>
  ): Promise<void> {
    const guildId = interaction.values.shift()!;
    const guild = await this.client.guilds.fetch(guildId);
    const buttonLabel = truncate(
      `${this.options.createButtonOptions.label} - ${guild.name}`,
      80
    );
    const rowButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder(this.options.createButtonOptions)
        .setLabel(buttonLabel)
        .setCustomId(`${this.#createTicketId}${guildId}`)
    );
    await interaction.update({ components: [rowButton] });
  }

  async #handleLog(ticket: Ticket): Promise<void> {
    if (!this.options.loggingOptions) return;

    const logs = ticket.messages.map(
      this.options.loggingOptions.generateLogEntry
    );
    if (
      logs.length > 0 &&
      !this.options.loggingOptions.showSenderNames &&
      logs[0].includes(ticket.messages[0].author.username)
    ) {
      throw new Error(ErrorMessages.senderNamesAppear);
    }

    const content = this.options.loggingOptions.generateMessage(ticket);
    const logMessage =
      typeof content === 'string'
        ? ({
            content,
            files: [
              {
                attachment: Buffer.from(logs.join('\n')),
                name: this.options.loggingOptions.generateFilename(ticket),
              },
            ],
          } as MessageOptions)
        : {
            ...content,
            files: [
              {
                attachment: Buffer.from(logs.join('\n')),
                name: this.options.loggingOptions.generateFilename(ticket),
              },
            ],
          };

    if (this.options.loggingOptions.sendToRecipient) {
      await ticket.createdBy.send(logMessage);
    }

    if (this.options.loggingOptions.sendInThread && ticket.threadId !== null) {
      const thread = (await this.client.channels.fetch(
        ticket.threadId
      )) as ThreadChannel;
      await thread.send(logMessage);
      await this.#updateThread(ticket);
    }

    const guildLogChannel = this.options.loggingOptions.channels.get(
      ticket.guildId!
    );
    const logChannel =
      typeof guildLogChannel === 'string'
        ? ((await this.client.channels.fetch(
            guildLogChannel
          )) as GuildTextBasedChannel)
        : guildLogChannel;
    await logChannel?.send(logMessage);
  }

  async #onCreateButtonInteraction(
    interaction: ButtonInteraction
  ): Promise<void> {
    const modal = await this.#generateModal(interaction.customId);
    await interaction.showModal(modal);
  }

  async #onReplyButtonInteraction(
    interaction: ButtonInteraction
  ): Promise<void> {
    const ticketId = interaction.customId.slice(
      this.#replyTicketIdPrefix.length
    );
    const ticket = this.getTicketById(ticketId);
    const modal = await this.#generateModal(interaction.customId, ticket);
    await interaction.showModal(modal);
  }

  async #onForceCloseButtonInteraction(
    interaction: ButtonInteraction
  ): Promise<void> {
    await interaction.deferReply();

    const ticketId = interaction.customId.slice(
      this.#forceCloseTicketIdPrefix.length
    );
    const ticket = this.getTicketById(ticketId);

    this.emit(MailboxManagerEvents.ticketForceClose, ticket, interaction.user);
    this.closeTicket(ticket.id);

    await interaction.editReply(this.options.interactionReply);
    await this.#updateThread(ticket);
  }

  async #onNewTicketSubmitInteraction(
    interaction: ModalSubmitInteraction
  ): Promise<void> {
    await interaction.deferReply();

    const guildId = interaction.customId.slice(this.#createTicketId.length);
    const ticketContent = createTicketContentFromInteraction(interaction);

    const ticket = this.createTicket(ticketContent);
    ticket.setGuild(guildId);

    const channel = await this.#getChannel(ticket);
    const ticketMessage = await this.#generateMessageFromTicket(ticket);
    await channel.send(ticketMessage);

    await interaction.editReply(this.options.interactionReply);
  }

  async #onReplySubmitInteraction(
    interaction: ModalSubmitInteraction
  ): Promise<void> {
    await interaction.deferReply();

    const ticketContent = createTicketContentFromInteraction(interaction);
    const ticketId = interaction.customId.slice(
      this.#replyTicketIdPrefix.length
    );
    const ticket = this.getTicketById(ticketId);

    this.replyToTicket(ticketContent, ticket.id);

    const ticketMessage = await this.#generateMessageFromTicket(ticket);
    const isSentToAdmin = interaction.channel?.type === ChannelType.DM;
    const channel = await this.#getChannel(ticket);
    const answerMessage = await (isSentToAdmin
      ? channel
      : ticket.createdBy
    ).send(ticketMessage);

    await interaction.editReply(this.options.interactionReply);
    this.emit(MailboxManagerEvents.replySent, interaction, answerMessage);
  }

  async #getChannel(ticket: Ticket): Promise<PartialTextBasedChannelFields> {
    const mailboxChannel = this.options.mailboxChannels.get(ticket.guildId!);
    if (!mailboxChannel) throw new Error(ErrorMessages.noMailboxRegistered);

    const guildChannel =
      typeof mailboxChannel === 'string'
        ? ((await this.client.channels.fetch(
            mailboxChannel
          )) as BaseGuildTextChannel)
        : mailboxChannel;
    let thread: ThreadChannel | null = null;
    if (
      !ticket.threadId &&
      this.options.threadOptions &&
      guildChannel.type !== ChannelType.GuildVoice
    ) {
      const startMessage = await guildChannel.send(
        this.options.threadOptions.startMessage(ticket)
      );
      thread = await (guildChannel as BaseGuildTextChannel).threads.create({
        name: this.options.threadOptions.name(ticket),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        startMessage,
        type: ChannelType.GuildPublicThread,
      });
      ticket.setChannel(thread.id);
      this.emit(MailboxManagerEvents.threadCreate, ticket, thread);
    } else if (ticket.threadId) {
      thread = await (guildChannel as BaseGuildTextChannel).threads.fetch(
        ticket.threadId
      );
    }

    return thread ?? guildChannel;
  }

  async #generateMessageFromTicket(ticket: Ticket): Promise<MessageOptions> {
    const isSentToAdmin = ticket.lastMessage.channel?.type === ChannelType.DM;

    const guild = await this.client.guilds.fetch(ticket.guildId!);
    const header = this.options.formatTitle(ticket, guild);
    const prefix =
      isSentToAdmin || this.options.loggingOptions?.showSenderNames
        ? `${ticket.lastMessage.author.username}:\n`
        : null;
    const suffix = `\n\n**${this.options.replyMessage}**`;
    const description = `${!isNullOrWhiteSpaces(prefix) ? prefix : ''}${
      ticket.lastMessage.cleanContent
    }${!isNullOrWhiteSpaces(suffix) ? suffix : ''}`;

    const footer = `ID: ${ticket.lastMessage.id}`;

    const replyButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder({
        ...this.options.replyButtonOptions,
        customId: `${this.#replyTicketIdPrefix}${ticket.id}`,
      })
    );
    if (this.options.forceCloseEmoji) {
      replyButtonRow.addComponents(
        new ButtonBuilder({
          ...this.options.forceCloseButtonOptions,
          emoji: this.options.forceCloseEmoji,
          customId: `${this.#forceCloseTicketIdPrefix}${ticket.id}`,
        })
      );
    }

    return this.options.embedOptions
      ? {
          embeds: [
            new EmbedBuilder(this.options.embedOptions)
              .setAuthor({
                name: header,
                iconURL: isSentToAdmin ? arrowDown : undefined,
              })
              .setDescription(description)
              .setFooter({ text: footer })
              .setTimestamp(),
          ],
          components: [replyButtonRow],
        }
      : {
          content: `${header}\n\n​${description}\n\n​${footer}`,
          components: [replyButtonRow],
        };
  }

  async #generateModal(
    customId: string,
    ticket?: Ticket
  ): Promise<ModalBuilder> {
    const guildId =
      ticket && ticket.guildId
        ? ticket.guildId
        : customId.slice(this.#createTicketId.length);
    const guild = await this.client.guilds.fetch(guildId);
    const messageRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        new TextInputBuilder({
          ...this.options.modalOptions.modalComponentsOptions,
          required: true,
          customId: 'message',
        })
      );
    const modalTitle = ticket
      ? this.options.formatTitle(ticket, guild)
      : this.options.modalOptions.formatTitle(guild);
    // TODO: add an attachment component https://github.com/discord/discord-api-docs/discussions/4482
    const modal = new ModalBuilder()
      .setTitle(truncate(modalTitle, 45))
      .setCustomId(customId)
      .addComponents(messageRow);

    return modal;
  }

  async #updateThread(ticket: Ticket): Promise<void> {
    if (ticket.threadId) {
      const thread = (await this.client.channels.fetch(
        ticket.threadId
      )) as ThreadChannel;

      if (
        this.options.closedChannelPrefix &&
        !thread.name.startsWith(this.options.closedChannelPrefix)
      ) {
        await thread.setName(
          `${this.options.closedChannelPrefix ?? ''}${thread.name}`
        );
      }
      if (!thread.archived) await thread.setArchived(true);
    }
  }
}
