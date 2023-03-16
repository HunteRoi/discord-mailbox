import {
  BaseGuildTextChannel,
  ButtonInteraction,
  Client,
  Interaction,
  ModalSubmitInteraction,
  PartialTextBasedChannelFields,
  TextInputBuilder,
  ThreadChannel,
  User,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  EmbedBuilder,
  Events,
  Guild,
  ChannelType,
  ThreadAutoArchiveDuration,
  ModalActionRowComponentBuilder,
  CacheType,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  BaseMessageOptions,
  Snowflake,
  TextChannel
} from 'discord.js';
import ErrorMessages from './ErrorMessages';
import { MailboxManager } from './MailboxManager';
import { MailboxManagerEvents } from './MailboxManagerEvents';
import {
  createTicketContentFromInteraction,
  Ticket,
  UserTickets,
  ManagerOptions
} from './types';
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
  readonly #options!: ManagerOptions;

  /**
   * Creates an instance of InteractionBasedMailboxManager.
   * @param {Client} client
   * @param {ManagerOptions} options
   * @memberof InteractionBasedMailboxManager
   */
  constructor(client: Client, options: ManagerOptions) {
    super(client, options.mailboxOptions);

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
            interaction.isStringSelectMenu() &&
            interaction.customId === this.#selectGuild
          )
            await this.#onGuildChoiceInteraction(interaction);
        } catch (error) {
          console.debug(error);
          if ((interaction.isMessageComponent() || interaction.isModalSubmit()) && !interaction.replied) {
            if (interaction.deferred)
              await interaction.editReply(`Action not possible: ${(error as any).message}`);
            else
              await interaction.reply(`Action not possible: ${(error as any).message}`);
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
        const guildId = ticket.guildId;
        const guildOptions = this.#options.optionsPerGuild.get(guildId);
        if (ticket.isOutdated(this.#options.mailboxOptions.closeTicketAfterInMilliseconds) && guildOptions) {
          await this.#updateThread(ticket, guildOptions.generateClosedChannelName);
          this.closeTicket(ticket.id);
        }
      });
  }

  /**
   * Sends the select menu to choose a guild.
   *
   * @param {User} user
   * @return {Promise<void>}
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
    ).filter((guild): guild is Guild => guild instanceof Guild && this.#options.optionsPerGuild.has(guild.id));

    let row: ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>;
    if (userGuilds.length === 1) {
      row = await this.#generateStartButtonRow(userGuilds[0].id);
    } else {
      row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder(this.#options.selectGuildOptions)
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
    }
    await user.send({ components: [row] });
  }

  /**
   * Sends the start button to create a ticket.
   *
   * @param {SelectMenuInteraction<CacheType>} interaction
   * @return {Promise<void>}
   * @memberof InteractionBasedMailboxManager
   */
  async #onGuildChoiceInteraction(interaction: StringSelectMenuInteraction<CacheType>): Promise<void> {
    const guildId = interaction.values.shift()!;
    const rowButton = await this.#generateStartButtonRow(guildId);
    await interaction.update({ components: [rowButton] });
  }

  async #generateStartButtonRow(guildId: Snowflake): Promise<ActionRowBuilder<ButtonBuilder>> {
    const guild = await this.client.guilds.fetch(guildId);
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    const buttonLabel = truncate(`${guildOptions.createButtonOptions.label} - ${guild.name}`, 80);
    const rowButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder(guildOptions.createButtonOptions)
        .setLabel(buttonLabel)
        .setCustomId(`${this.#createTicketId}${guildId}`)
    );
    return rowButton;
  }

  async #handleLog(ticket: Ticket): Promise<void> {
    const guildId = ticket.guildId;
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    if (!guildOptions.loggingOptions) return;

    const logs = ticket.messages.map(guildOptions.loggingOptions.generateLogEntry);
    if (
      logs.length > 0 &&
      !guildOptions.loggingOptions.showSenderNames &&
      logs[0].includes(ticket.messages[0].author.username)
    ) {
      throw new Error(ErrorMessages.senderNamesAppear);
    }

    const content = guildOptions.loggingOptions.generateMessage(ticket);
    const logMessage =
      typeof content === 'string'
        ? ({
          content,
          files: [
            {
              attachment: Buffer.from(logs.join('\n')),
              name: guildOptions.loggingOptions.generateFilename(ticket),
            },
          ],
        } as BaseMessageOptions)
        : {
          ...content,
          files: [
            {
              attachment: Buffer.from(logs.join('\n')),
              name: guildOptions.loggingOptions.generateFilename(ticket),
            },
          ],
        };

    if (guildOptions.loggingOptions.sendInThread && ticket.threadId !== null) {
      const thread = (await this.client.channels.fetch(
        ticket.threadId
      )) as ThreadChannel;
      await thread.send(logMessage);
      await this.#updateThread(ticket, guildOptions.generateClosedChannelName);
    }

    const guildLogChannel = guildOptions.loggingOptions.logChannel;
    const logChannel = await this.client.channels.fetch(guildLogChannel) as TextChannel;
    await logChannel.send(logMessage);

    await ticket.createdBy.send(logMessage);
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
    const guildId = ticket.guildId;
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);
    const guild = await this.client.guilds.fetch(guildId);

    this.emit(MailboxManagerEvents.ticketForceClose, ticket, interaction.user);
    this.closeTicket(ticket.id);

    await interaction.editReply(guildOptions.generateReplyMessage(ticket, guild));
    await this.#updateThread(ticket, guildOptions.generateClosedChannelName);
  }

  async #onNewTicketSubmitInteraction(
    interaction: ModalSubmitInteraction
  ): Promise<void> {
    await interaction.deferReply();

    const guildId = interaction.customId.slice(this.#createTicketId.length);
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    const guild = await this.client.guilds.fetch(guildId);
    const ticketContent = createTicketContentFromInteraction(interaction);
    let ticket: Ticket;
    try {
      ticket = this.createTicket(ticketContent, guildId, guildOptions.maxOnGoingTicketsPerUser);
    } catch (error) {
      if ((error as any).message.startsWith('0002'))
        throw new Error(guildOptions.generateTooMuchTicketsMessage(interaction.user, guild));
      throw error;
    }
    const channel = await this.#getChannel(ticket);
    const ticketMessage = await this.#generateMessageFromTicket(ticket);
    await channel.send(ticketMessage);

    await interaction.editReply(guildOptions.generateReplyMessage(ticket, guild));
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
    const guildId = ticket.guildId;
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    this.replyToTicket(ticketContent, ticket.id);

    const guild = await this.client.guilds.fetch(guildId);
    const ticketMessage = await this.#generateMessageFromTicket(ticket);
    const isSentToAdmin = interaction.channel?.type === ChannelType.DM;
    const channel = await this.#getChannel(ticket);
    const answerMessage = await (isSentToAdmin
      ? channel
      : ticket.createdBy
    ).send(ticketMessage);

    await interaction.editReply(guildOptions.generateReplyMessage(ticket, guild));
    this.emit(MailboxManagerEvents.replySent, interaction, answerMessage);
  }

  async #getChannel(ticket: Ticket): Promise<PartialTextBasedChannelFields> {
    const guildId = ticket.guildId;
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    const mailboxChannel = guildOptions.mailboxChannel;
    if (!mailboxChannel) throw new Error(ErrorMessages.noMailboxRegistered);

    const guildChannel = await this.client.channels.fetch(mailboxChannel) as BaseGuildTextChannel;
    let thread: ThreadChannel | null = null;
    if (
      !ticket.threadId &&
      guildOptions.threadOptions &&
      guildChannel.type !== ChannelType.GuildVoice
    ) {
      const startMessage = await guildChannel.send(guildOptions.threadOptions.generateStartMessage(ticket));
      thread = await guildChannel.threads.create({
        name: guildOptions.threadOptions.generateName(ticket),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        startMessage,
        type: ChannelType.PublicThread,
      });
      ticket.setThreadChannel(thread.id);
      this.emit(MailboxManagerEvents.threadCreate, ticket, thread);
    } else if (ticket.threadId) {
      thread = await guildChannel.threads.fetch(ticket.threadId);
    }

    return thread ?? guildChannel;
  }

  async #generateMessageFromTicket(ticket: Ticket): Promise<BaseMessageOptions> {
    const isSentToAdmin = ticket.lastMessage.channel?.type === ChannelType.DM;

    const guildId = ticket.guildId;
    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    const guild = await this.client.guilds.fetch(ticket.guildId);
    const header = guildOptions.generateMessageTitle(ticket, guild);
    const description = ticket.lastMessage.cleanContent;
    const prefix =
      isSentToAdmin || guildOptions.loggingOptions?.showSenderNames
        ? `${ticket.lastMessage.author.username}:\n`
        : null;
    const suffix = `\n\n**${guildOptions.generateReplyMessage(ticket, guild)}**`;
    const footer = `ID: ${ticket.lastMessage.id}`;

    const replyButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder({
        ...guildOptions.replyButtonOptions,
        customId: `${this.#replyTicketIdPrefix}${ticket.id}`,
      })
    );
    if (guildOptions.forceCloseEmoji) {
      replyButtonRow.addComponents(
        new ButtonBuilder({
          ...guildOptions.forceCloseButtonOptions,
          emoji: guildOptions.forceCloseEmoji,
          customId: `${this.#forceCloseTicketIdPrefix}${ticket.id}`,
        })
      );
    }

    return guildOptions.embedOptions
      ? {
        embeds: [
          new EmbedBuilder(guildOptions.embedOptions)
            .setAuthor({
              name: isSentToAdmin ? ticket.lastMessage.author.username : guild.name,
              iconURL: isSentToAdmin ? ticket.lastMessage.author.displayAvatarURL() : guild.iconURL() ?? undefined,
            })
            .setDescription(description)
            .setFooter({ text: header })
            .setTimestamp(),
        ],
        components: [replyButtonRow],
      }
      : {
        content: `${header}\n\n${!isNullOrWhiteSpaces(prefix) ? prefix : ''}​${description}${!isNullOrWhiteSpaces(suffix) ? suffix : ''}\n\n​${footer}`,
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

    const guildOptions = this.#options.optionsPerGuild.get(guildId);
    if (!guildOptions) throw Error(ErrorMessages.guildNotRegistered);

    const guild = await this.client.guilds.fetch(guildId);
    const messageRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        new TextInputBuilder({
          ...guildOptions.modalOptions?.modalComponentsOptions,
          required: true,
          customId: 'message',
        })
      );
    const modalTitle = (ticket ? guildOptions.generateMessageTitle(ticket, guild) : guildOptions.modalOptions?.generateTitle(guild)) ?? 'Anything to say?';
    // TODO: add an attachment component https://github.com/discord/discord-api-docs/discussions/4482
    const modal = new ModalBuilder()
      .setTitle(truncate(modalTitle, 45))
      .setCustomId(customId)
      .addComponents(messageRow);

    return modal;
  }

  async #updateThread(ticket: Ticket, generateName?: (ticket: Ticket, guild: Guild, thread?: ThreadChannel) => string): Promise<void> {
    if (ticket.threadId) {
      const thread = await this.client.channels.fetch(ticket.threadId) as ThreadChannel;
      const newName = (generateName && generateName(ticket, thread.guild, thread)) ?? thread.name;

      if (thread.name !== newName) {
        await thread.setName(newName);
      }
      if (!thread.archived) await thread.setArchived(true);
    }
  }
}
