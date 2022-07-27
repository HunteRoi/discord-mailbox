import {
  Collection,
  Message,
  MessageAttachment,
  MessageMentions,
  ModalSubmitInteraction,
  Snowflake,
  TextBasedChannel,
  User,
} from 'discord.js';

export type TicketContent = Pick<
  Message,
  | 'attachments'
  | 'author'
  | 'cleanContent'
  | 'content'
  | 'createdAt'
  | 'createdTimestamp'
  | 'id'
  | 'stickers'
  | 'url'
  | 'channelId'
  | 'embeds'
> & {
  mentions?: MessageMentions;
  channel: TextBasedChannel | null;
};

/**
 * Creates a ticket content.
 *
 * @export
 * @param {string} content
 * @param {User} author
 * @param {Date} createdAt
 * @param {number} createdTimestamp
 * @param {(Snowflake | null)} [channelId=null]
 * @param {(TextBasedChannel | null)} [channel=null]
 * @param {Collection<string, MessageAttachment>} [attachments=new Collection()]
 * @return {*}  {TicketContent}
 */
export function createTicketContent(
  content: string,
  author: User,
  createdAt: Date,
  createdTimestamp: number,
  channelId: Snowflake | null = null,
  channel: TextBasedChannel | null = null,
  attachments: Collection<string, MessageAttachment> = new Collection()
): TicketContent {
  return {
    content,
    cleanContent: content.trim(),
    author,
    createdAt,
    createdTimestamp,
    attachments,
    channel,
    channelId: channelId ?? '',
    id: '',
    url: '',
    embeds: [],
    stickers: new Collection(),
  };
}

/**
 * Creates a ticket content from an interaction submission.
 *
 * @export
 * @param {ModalSubmitInteraction} interaction
 * @return {*}  {TicketContent}
 */
export function createTicketContentFromInteraction(
  interaction: ModalSubmitInteraction
): TicketContent {
  const messageContent = interaction.fields.getTextInputValue('message');
  return createTicketContent(
    messageContent,
    interaction.user,
    interaction.createdAt,
    interaction.createdTimestamp,
    interaction.channelId,
    interaction.channel
  );
}
