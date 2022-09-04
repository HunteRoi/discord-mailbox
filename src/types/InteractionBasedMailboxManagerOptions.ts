import {
  InteractionButtonComponentData,
  SelectMenuComponentData,
} from 'discord.js';
import { ModalOptions } from './ModalOptions';
import { MessageBasedMailboxManagerOptions } from './MessageBasedMailboxManagerOptions';

export type InteractionBasedMailboxManagerOptions = {
  /**
   * The settings of the select menu.
   *
   * @type {(Exclude<SelectMenuComponentData, 'disabled' | 'customId'>)}
   */
  selectGuildOptions: Exclude<SelectMenuComponentData, 'disabled' | 'customId'>;

  /**
   * The settings of the creation button.
   *
   * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>)}
   */
  createButtonOptions: Exclude<
    InteractionButtonComponentData,
    'disabled' | 'customId'
  >;

  /**
   * The settings of the reply button.
   *
   * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>)}
   */
  replyButtonOptions: Exclude<
    InteractionButtonComponentData,
    'disabled' | 'customId'
  >;

  /**
   * The settings of the close button.
   *
   * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'emoji' | 'customId'>)}
   */
  forceCloseButtonOptions: Exclude<
    InteractionButtonComponentData,
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
