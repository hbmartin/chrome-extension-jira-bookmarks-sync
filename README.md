# Jira Bookmarks Sync (Chrome Extension)

## Features

* Syncs your Jira issues to bookmarks
* Moving issue bookmarks between status transitions them in Jira
* No config UI yet

## Building

1. Clone repo
2. If you don't have node, `brew install node`
3. `npm i`
4. Update constants at the top of `eventPage.ts` with your Jira URL and user info
5. `npm run dev` to compile once
6. ... or `npm run watch` to run the dev task in watch mode
7. `npm run build` to build a production (minified) version

## Installation

1. Complete the steps to build the project above
2. Go to [_chrome://extensions_](chrome://extensions) in Google Chrome
3. Turn on developer mode (upper right corner toggle... probably)
4. Click **Load unpacked** and select the _dist_ folder from this repo

## Contributing

Please [file a bug report](https://github.com/hbmartin/chrome-extension-jira-bookmarks-sync/issues) for any issues you find. Even more excellent than a good bug report or feature request is a patch in a PR! We'd love to have your contributions.

### Code Formatting

This project is linted with [ESLint](https://eslint.org/) using the [Facebook config](https://www.npmjs.com/package/eslint-config-fbjs).


### Code of Conduct

Treat other people with respect and more generally to follow the guidelines articulated in the [Contributor Covenant](https://www.contributor-covenant.org/).

## Authors

* [Harold Martin](https://www.linkedin.com/in/harold-martin-98526971/) - harold.martin at gmail

## Legal

* Based on [chrome-extension-react-typescript-boilerplate](https://github.com/martellaj/chrome-extension-react-typescript-boilerplate) from [martellaj](https://github.com/martellaj)
* Jira and the Jira logo design are registered trademarks of Atlassian.
* Chrome and the Chrome logo design are registered trademarks of Google.
* This is an unofficial Jira plugin is not associated with Atlassian or Google.
* Released under [MIT license](LICENSE).
