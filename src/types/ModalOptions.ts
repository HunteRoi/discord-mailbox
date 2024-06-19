import type { Guild, TextInputComponentData } from "discord.js";

export interface ModalOptions {
    /**
     * A function to build a modal's title from the selected guild object.
     *
     * @type {string}
     */
    generateTitle: (guild: Guild) => string;

    /**
     * The modal components' settings.
     *
     * @type {(Omit<TextInputComponentData, 'required' | 'value' | 'type' | 'customId'>)}
     */
    modalComponentsOptions: Omit<
        TextInputComponentData,
        "required" | "value" | "type" | "customId"
    >;
}
