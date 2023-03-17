import { Guild, InteractionButtonComponentData } from 'discord.js';
import { Ticket } from './Ticket';

export type InteractionOptions = {
    /**
     * A function to build the reply message.
     *
     */
    generateInteractionReplyMessage: (ticket: Ticket, guild: Guild) => string;

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
     * @type {(Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>)}
     */
    forceCloseButtonOptions?: Exclude<InteractionButtonComponentData, 'disabled' | 'customId'>;
};
