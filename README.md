# Discord Mailbox

## Installation

```sh
npm install --save @hunteroi/discord-mailbox
```

## Examples
See [./example/index.js](example/index.js).

## Events
```ts
manager.on('ticketCreate', () => {});

manager.on('ticketUpdate', () => {});

manager.on('ticketClose', () => {});

manager.on('ticketDelete', () => {});

manager.on('replyDelete', () => {});

manager.on('replySent', () => {});
```

## Contribution
Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your Branch: `git checkout -b patch/YourAmazingWork`
3. Commit your Changes: `git commit -m 'Add some amazing work'`
4. Push to the Branch: `git push origin patch/YourAmazingWork`
5. Open a Pull Request
