import { TextInputComponentOptions } from 'discord.js';

export type ModalOptions = {
  /**
   * The title of the modal.
   *
   * @type {string}
   */
  title: string;

  /**
   * The modal components' settings.
   *
   * @type {(Exclude<TextInputComponentOptions, 'required' | 'value'>)}
   */
  modalComponentsOptions: Exclude<
    TextInputComponentOptions,
    'required' | 'value'
  >;
};
