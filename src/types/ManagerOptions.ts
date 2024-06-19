import type {
    Collection,
    GuildResolvable,
    StringSelectMenuComponentData,
} from "discord.js";

import type { GlobalMailboxOptions } from "./GlobalMailboxOptions.js";
import type { PerGuildMailboxOptions } from "./PerGuildMailboxOptions.js";

export interface ManagerOptions {
    /**
     * The settings of the select menu.
     *
     * @type {(Exclude<StringSelectMenuComponentData, 'disabled' | 'customId'>)}
     */
    selectGuildOptions?: Exclude<
        StringSelectMenuComponentData,
        "disabled" | "customId"
    >;

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
}
