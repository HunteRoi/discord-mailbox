# Breaking Changes

## Rework of the entire options parameter

The option parameter is now fully supporting different guilds. The changes made are structural but some renaming also occured.

It is strongly advised to revise the entire options you are passing to the manager and restructure it with the new type accessible [here](./src/types/ManagerOptions.ts).

## Error messages have now error codes

The error messages now have error codes from 001 to 0006. You can inspect these directly [in the source code](./src/ErrorMessages.ts).