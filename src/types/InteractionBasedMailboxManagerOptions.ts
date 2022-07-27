import { InteractionButtonOptions } from 'discord.js';
import { ModalOptions } from './ModalOptions';
import { MessageBasedMailboxManagerOptions } from './MessageBasedMailboxManagerOptions';

export type InteractionBasedMailboxManagerOptions = {
  /**
   * The settings of the creation button.
   *
   * @type {(Exclude<InteractionButtonOptions, 'disabled' | 'customId'>)}
   */
  createButtonOptions: Exclude<
    InteractionButtonOptions,
    'disabled' | 'customId'
  >;

  /**
   * The settings of the reply button.
   *
   * @type {(Exclude<InteractionButtonOptions, 'disabled' | 'customId'>)}
   */
  replyButtonOptions: Exclude<
    InteractionButtonOptions,
    'disabled' | 'customId'
  >;

  /**
   * The settings of the close button.
   *
   * @type {(Exclude<InteractionButtonOptions, 'disabled' | 'emoji' | 'customId'>)}
   */
  forceCloseButtonOptions: Exclude<
    InteractionButtonOptions,
    'disabled' | 'emoji' | 'customId'
  >;

  /**
   * The settings for the modal forms.
   *
   * @type {ModalOptions}
   */
  modalOptions: ModalOptions;

  /**
   * The message sent when an interaction is replied.
   *
   * @type {string}
   */
  interactionReply: string;
} & MessageBasedMailboxManagerOptions;
