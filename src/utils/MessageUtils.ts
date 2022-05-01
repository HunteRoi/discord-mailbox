import { Message, PartialMessage, Snowflake } from 'discord.js';

/**
 * Extract the message ID from a message content or an embed's footer.
 *
 * @export
 * @param {(Message | PartialMessage)} message
 * @param {boolean} embedsAreActive
 * @return {Snowflake} messageId
 */
export function extractMessageId(
  message: Message | PartialMessage,
  embedsAreActive: boolean
): Snowflake {
  let messageId: Snowflake;
  if (embedsAreActive) {
    messageId = message.embeds[0].footer.text.replace('ID: ', '');
  } else {
    const footer = message.content.split('\n\n​').pop();
    messageId = footer.replace('ID: ', '');
  }
  return messageId;
}
