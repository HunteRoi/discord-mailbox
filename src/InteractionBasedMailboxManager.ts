import { ButtonInteraction, Client, ModalSubmitInteraction } from "discord.js";

import { MailboxManager } from "./MailboxManager";
import { MailboxManagerEvents } from "./MailboxManagerEvents";
import { InteractionBasedMailboxManagerOptions, Ticket } from "./types";

export class InteractionBasedMailboxManager extends MailboxManager {
    protected options: InteractionBasedMailboxManagerOptions;

    constructor(client: Client, options: InteractionBasedMailboxManagerOptions) {
        super(client, options);

        this.on(MailboxManagerEvents.ticketLog, (ticket: Ticket) => this.handleLog(ticket));
    }

    private async handleLog(ticket: Ticket): Promise<void> { }

    private async onCreateButtonInteraction(interaction: ButtonInteraction): Promise<void> { }

    private async onCloseButtonInteraction(interaction: ButtonInteraction): Promise<void> { }

    private async onNewTicketSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> { }

    private async onReplySubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> { }
}