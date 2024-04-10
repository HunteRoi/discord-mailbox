/** @type {import('typedoc').TypeDocOptions} */
export default {
    "entryPoints": ["src/index.ts"],
    "out": "docs/api-docs",
    "hideGenerator": true,
    "excludePrivate": true,
    "excludeExternals": true,
    "navigationLinks": {
        "GitHub": "https://github.com/hunteroi/discord-mailbox",
        "Breaking Changes": "https://github.com/hunteroi/discord-mailbox/blob/master/BREAKING_CHANGES.md"
    }
}
