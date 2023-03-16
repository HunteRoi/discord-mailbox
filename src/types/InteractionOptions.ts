import { InteractionButtonComponentData } from 'discord.js';

export type InteractionOptions = {
    /**
     * The settings of the creation button.
     *
     * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>)}
     */
    createButtonOptions: Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>;

    /**
     * The settings of the reply button.
     *
     * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>)}
     */
    replyButtonOptions: Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>;

    /**
     * The settings of the close button.
     *
     * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'emoji' | 'customId'>)}
     */
    forceCloseButtonOptions: Exclude<InteractionButtonComponentData, 'disabled' | 'emoji' | 'customId'>;
};
