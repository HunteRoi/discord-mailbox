import type { Guild, InteractionButtonComponentData } from "discord.js";

import type { Ticket } from "./Ticket.js";

export interface InteractionOptions {
    /**
     * A function to build the reply message.
     *
     */
    generateInteractionReplyMessage: (ticket: Ticket, guild: Guild) => string;

    /**
     * The settings of the creation button.
     *
     * @type {(Omit<InteractionButtonComponentData, 'disabled' | 'customId' | 'type'>)}
     */
    createButtonOptions: Omit<
        InteractionButtonComponentData,
        "disabled" | "customId" | "type"
    >;

    /**
     * The settings of the reply button.
     *
     * @type {(Omit<InteractionButtonComponentData, 'disabled' | 'customId' | 'type'>)}
     */
    replyButtonOptions: Omit<
        InteractionButtonComponentData,
        "disabled" | "customId" | "type"
    >;

    /**
     * The settings of the close button.
     *
     * @type {(Omit<InteractionButtonComponentData, 'disabled' | 'customId' | 'type'>)}
     */
    forceCloseButtonOptions?: Omit<
        InteractionButtonComponentData,
        "disabled" | "customId" | "type"
    >;
}
