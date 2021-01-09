import { MessageEmbedOptions } from 'discord.js';

/**
 *
 * @export
 * @interface EmbedOptions
 */
export interface EmbedOptions extends MessageEmbedOptions {
  /**
   * Whether the message should be sent as an embed or not.
   *
   * @type {boolean}
   */
  send: boolean;
}
