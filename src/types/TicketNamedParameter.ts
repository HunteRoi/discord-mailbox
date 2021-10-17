import { Message } from 'discord.js';

export interface TicketNamedParameter {
	firstMessage: Message;
	formatLogs?: (message: Message) => string;
	closeAfter?: number;
	shouldFormatLog?: boolean;
}
