import { Message, Snowflake } from 'discord.js';

export interface TicketNamedParameter {
	firstMessage: Message;
	//channelId: Snowflake;
	formatLogs?: (message: Message) => string;
	closeAfter?: number;
	shouldFormatLog?: boolean;
}
