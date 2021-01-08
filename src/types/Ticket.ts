import { Collection, Message, Snowflake } from 'discord.js';

export interface Ticket {
  id: string;
  messages: Collection<Snowflake, Message>;
  messagesContent: Array<string>;
  lastMessageAt: number;
  createdBy: Snowflake;
  createdAt: number;
  closedAt?: number;
}
