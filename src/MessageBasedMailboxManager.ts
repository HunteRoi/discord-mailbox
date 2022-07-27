import {
  Client,
  Constants,
  BaseGuildTextChannel,
  Message,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  ThreadChannel,
  User,
  AllowedThreadTypeForTextChannel,
  MessageEmbed,
  MessageOptions,
  Snowflake,
  GuildTextBasedChannel,
  PartialTextBasedChannelFields,
} from 'discord.js';

import { MailboxManager } from './MailboxManager';
import { MailboxManagerEvents } from './MailboxManagerEvents';
import {
  MessageBasedMailboxManagerOptions,
  Ticket,
  TicketContent,
  UserTickets,
} from './types';
import { isNullOrWhiteSpaces } from './utils/StringUtils';
import { arrowDown, arrowUp } from './utils/constants';
import ErrorMessages from './ErrorMessages';

/**
 * A mailbox working on messages.
 *
 * @export
 * @class MessageBasedMailboxManager
 * @extends {MailboxManager}
 */
export class MessageBasedMailboxManager extends MailboxManager {
  /**
   * The options of the messages manager.
   *
   * @protected
   * @memberof MessageBasedMailboxManager
   */
  protected override readonly options!: MessageBasedMailboxManagerOptions;

  /**
   * Creates an instance of MessageBasedMailboxManager.
   * @param {Client} client
   * @param {MessageBasedMailboxManagerOptions} options
   * @memberof MessageBasedMailboxManager
   */
  constructor(client: Client, options: MessageBasedMailboxManagerOptions) {
    super(client, options);

    this.client.on(
      Constants.Events.MESSAGE_CREATE,
      async (message: Message | PartialMessage) => {
        try {
          const msg = message.partial
            ? await message.fetch(true)
            : (message as Message);
          if (msg.author.bot) return;

          switch (message.channel.type) {
            case Constants.ChannelTypes[Constants.ChannelTypes.GROUP_DM]:
            case Constants.ChannelTypes[Constants.ChannelTypes.DM]:
              await this.onDMCreate(msg);
              break;

            case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_TEXT]:
            case Constants.ChannelTypes[Constants.ChannelTypes.GUILD_VOICE]:
            case Constants.ChannelTypes[
              Constants.ChannelTypes.GUILD_PRIVATE_THREAD
            ]:
            case Constants.ChannelTypes[
              Constants.ChannelTypes.GUILD_PUBLIC_THREAD
            ]:
              await this.onGuildReply(msg);
              break;

            default:
              throw new Error("Unsupported type of message's channel.");
          }
        } catch (error) {
          console.debug(error);

          const err = error as Error;
          if (
            err.message === ErrorMessages.tooMuchTicketsOpened &&
            this.options.tooMuchTickets
          ) {
            await message.reply(this.options.tooMuchTickets);
          }
        }
      }
    );

    this.client.on(
      Constants.Events.MESSAGE_REACTION_ADD,
      async (
        messageReaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser
      ) => {
        try {
          const msgReaction = messageReaction.partial
            ? await messageReaction.fetch()
            : (messageReaction as MessageReaction);
          const usr = user.partial ? await user.fetch(true) : (user as User);
          if (usr.bot) return;

          await this.onReactionAdd(msgReaction, usr);
        } catch (error) {
          console.debug(error);
        }
      }
    );

    this.on(MailboxManagerEvents.ticketLog, async (ticket: Ticket) => {
      try {
        await this.handleLog(ticket);
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
          this.updateThread(ticket);

          this.closeTicket(ticket.id);
        }
      });
  }

  private async handleLog(ticket: Ticket): Promise<void> {
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
      await this.updateThread(ticket);
    }

    const logChannel =
      typeof this.options.loggingOptions.channel === 'string'
        ? ((await this.client.channels.fetch(
          this.options.loggingOptions.channel
        )) as GuildTextBasedChannel)
        : this.options.loggingOptions.channel;
    await logChannel.send(logMessage);
  }

  private async onDMCreate(message: Message): Promise<void> {
    let ticket: Ticket | undefined;

    if (message.reference && message.reference.messageId) {
      const previousMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );
      const lastMessageId = this.extractMessageId(previousMessage);
      ticket = this.getTicketByLastMessage(lastMessageId, true);
    }

    if (ticket) this.replyToTicket(message as TicketContent, ticket.id);
    else ticket = this.createTicket(message);

    const channel = await this.getChannel(ticket);
    const ticketMessage = this.generateMessageFromTicket(ticket);
    const answerMessage = await channel.send(ticketMessage);

    if (this.options.forceCloseEmoji) {
      await answerMessage.react(this.options.forceCloseEmoji);
    }
  }

  private async onGuildReply(message: Message): Promise<void> {
    if (!message.reference || !message.reference.messageId)
      throw new Error(ErrorMessages.messageIsNotReply);
    const previousMessage = await message.channel.messages.fetch(
      message.reference.messageId
    );
    const lastMessageId = this.extractMessageId(previousMessage);
    const ticket = this.getTicketByLastMessage(lastMessageId);

    this.replyToTicket(message as TicketContent, ticket.id);

    const embed =
      previousMessage.embeds && previousMessage.embeds.length > 0
        ? previousMessage.embeds[0]
        : null;
    if (embed) {
      embed.setAuthor({
        name: embed.author?.name ?? this.client.user?.username ?? 'Unknown',
        iconURL: arrowUp,
      });
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

    this.emit(MailboxManagerEvents.replySent, message, answerMessage);
  }

  private extractMessageId(
    message: Message<boolean> | PartialMessage
  ): Snowflake {
    let messageId: Snowflake | null | undefined;
    if (this.options.embedOptions && message.embeds) {
      messageId = message.embeds[0]?.footer?.text?.replace('ID: ', '');
    } else {
      const footer = message.content?.split('\n\n​')?.pop();
      messageId = footer?.replace('ID: ', '');
    }

    if (!messageId) throw new Error(ErrorMessages.noPreviousMessageId);

    return messageId;
  }

  private generateMessageFromTicket(ticket: Ticket): MessageOptions {
    const isSentToAdmin =
      ticket.lastMessage.channel?.type ===
      Constants.ChannelTypes[Constants.ChannelTypes.DM] ||
      ticket.lastMessage.channel?.type ===
      Constants.ChannelTypes[Constants.ChannelTypes.GROUP_DM];

    const header = this.options.formatTitle(ticket);
    if (isNullOrWhiteSpaces(header) || !header.includes(ticket.id)) {
      throw new Error(ErrorMessages.headerMustContainTicketId);
    }
    const prefix =
      isSentToAdmin || this.options.loggingOptions?.showSenderNames
        ? `${ticket.lastMessage.author.username}:\n`
        : null;
    const suffix = `\n\n**${this.options.replyMessage}**`;
    const description = `${!isNullOrWhiteSpaces(prefix) ? prefix : ''}${ticket.lastMessage.cleanContent
      }${!isNullOrWhiteSpaces(suffix) ? suffix : ''}`;

    const footer = `ID: ${ticket.lastMessage.id}`;

    return this.options.embedOptions
      ? ({
        embeds: [
          new MessageEmbed(this.options.embedOptions)
            .setAuthor({
              name: header,
              iconURL: isSentToAdmin ? arrowDown : '',
            })
            .setDescription(description)
            .setFooter({ text: footer })
            .setTimestamp(),
        ],
      } as MessageOptions)
      : {
        content: `${header}\n\n​${description}\n\n​${footer}`,
      };
  }

  private async onReactionAdd(
    reaction: MessageReaction,
    user: User
  ): Promise<void> {
    if (reaction.emoji.name !== this.options.forceCloseEmoji) {
      throw new Error(ErrorMessages.notForceCloseEmoji);
    }

    const botMessage = reaction.message;
    const lastMessageId = this.extractMessageId(botMessage);

    const ticket = this.getTicketByLastMessage(lastMessageId);

    const embeds = botMessage.embeds;
    const embed = embeds && embeds.length > 0 ? embeds[0] : null;
    if (embed) {
      embed.setAuthor({
        name: embed.author?.name ?? this.client.user?.username ?? 'Unknown',
        iconURL: arrowUp,
      });
      embeds.splice(0, 1, embed);
      await botMessage.edit({
        content: botMessage.content || null,
        embeds,
      });
    }
    await this.updateThread(ticket);

    this.emit(MailboxManagerEvents.ticketForceClose, ticket, user);
    this.closeTicket(ticket.id);
  }

  private async updateThread(ticket: Ticket): Promise<void> {
    if (ticket.threadId) {
      const thread = (await this.client.channels.fetch(
        ticket.threadId
      )) as ThreadChannel;
      await thread.setName(
        `${this.options.closedChannelPrefix ?? ''}${thread.name}`
      );
      await thread.setArchived(true);
    }
  }

  private async getChannel(
    ticket: Ticket
  ): Promise<PartialTextBasedChannelFields> {
    const firstMailbox = this.options.mailboxChannel;
    if (!firstMailbox) throw new Error(ErrorMessages.noMailboxRegistered);

    const guildChannel =
      typeof firstMailbox === 'string'
        ? ((await this.client.channels.fetch(
          firstMailbox
        )) as BaseGuildTextChannel)
        : firstMailbox;
    let thread: ThreadChannel | null = null;
    if (
      !ticket.threadId &&
      this.options.threadOptions &&
      guildChannel.type !==
      Constants.ChannelTypes[Constants.ChannelTypes.GUILD_VOICE]
    ) {
      const startMessage = await guildChannel.send(
        this.options.threadOptions.startMessage(ticket)
      );
      thread = await (guildChannel as BaseGuildTextChannel).threads.create({
        name: this.options.threadOptions.name(ticket),
        autoArchiveDuration: 'MAX',
        startMessage,
        type: Constants.ChannelTypes[
          Constants.ChannelTypes.GUILD_PUBLIC_THREAD
        ] as AllowedThreadTypeForTextChannel,
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
}
