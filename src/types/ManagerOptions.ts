import { Collection, GuildResolvable, StringSelectMenuComponentData } from 'discord.js';
import { GlobalMailboxOptions } from './GlobalMailboxOptions';
import { PerGuildMailboxOptions } from './PerGuildMailboxOptions';

export type ManagerOptions = {
    /**
     * The settings of the select menu.
     *
     * @type {(Exclude<StringSelectMenuComponentData, 'disabled' | 'customId'>)}
     */
    selectGuildOptions?: Exclude<StringSelectMenuComponentData, 'disabled' | 'customId'>;

    /**
     * The global options for the mailbox manager, applied to all guilds.
     *
     * @type {GlobalMailboxOptions}
     */
    mailboxOptions: GlobalMailboxOptions;

    /**
     * The options per guild.
     *
     * @type {Collection<GuildResolvable, PerGuildMailboxOptions>}
     */
    optionsPerGuild: Collection<GuildResolvable, PerGuildMailboxOptions>;
};
