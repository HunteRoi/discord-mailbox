import { Collection, GuildTextBasedChannel, If, Interaction, Message, MessageAttachment, MessageMentions, ModalSubmitInteraction, Snowflake, TextBasedChannel, User } from "discord.js";

export type TicketContent = Pick<
    Message,
    | "attachments"
    | "author"
    | "cleanContent"
    | "content"
    | "createdAt"
    | "createdTimestamp"
    | "id"
    | "stickers"
    | "url"
    | "channelId"
    | "embeds"
> & {
    mentions?: MessageMentions,
    channel: TextBasedChannel | null
};

export function createTicketContent(content: string, author: User, createdAt: Date, createdTimestamp: number, channelId: Snowflake | null = null, channel: TextBasedChannel | null = null, attachments: Collection<string, MessageAttachment> = new Collection()): TicketContent {
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

export function createTicketContentFromInteraction(interaction: ModalSubmitInteraction): TicketContent {
    const messageContent = interaction.fields.getTextInputValue('message');
    return createTicketContent(messageContent, interaction.user, interaction.createdAt, interaction.createdTimestamp, interaction.channelId, interaction.channel);
}