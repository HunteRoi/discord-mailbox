import { Guild, TextInputComponentData } from 'discord.js';

export type ModalOptions = {
    /**
     * A function to build a modal's title from the selected guild object.
     *
     * @type {string}
     */
    generateTitle: (guild: Guild) => string;

    /**
     * The modal components' settings.
     *
     * @type {(Exclude<TextInputComponentData, 'required' | 'value'>)}
     */
    modalComponentsOptions: Exclude<TextInputComponentData, 'required' | 'value'>;
};
