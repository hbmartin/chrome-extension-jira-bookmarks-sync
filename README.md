# Jira Bookmarks Sync (Chrome Extension)

## Features

* Syncs your Jira issues to bookmarks
* Move an issue bookmark between statu folders to transitions them in Jira

## Installation

1. Download the latest release from the [Releases page](https://github.com/hbmartin/chrome-extension-jira-bookmarks-sync/releases)
2. Go to [_chrome://extensions_](chrome://extensions) in Google Chrome
3. Turn on the Developer mode using the toggle in the upper right corner
4. Click **Load unpacked** button in the upper left corner 
5. Select the folder from step 1

## Building

1. Clone this repo: `git clone git@github.com:hbmartin/chrome-extension-jira-bookmarks-sync.git`
2. If you don't have node: `brew install node`
3. Install dependencies: `npm i`
4. To compile once: `npm run dev`
5. Install from `dist` folder per directions above

## Contributing

* Please [file a bug report](https://github.com/hbmartin/chrome-extension-jira-bookmarks-sync/issues) for any issues you find.
* Even more excellent than a good bug report or feature request is a patch in a PR!
* This project is linted with [ESLint](https://eslint.org/) using the [Facebook config](https://www.npmjs.com/package/eslint-config-fbjs).
* Treat other people with kindness, see the [Contributor Covenant](https://www.contributor-covenant.org/).


## Authors

* [Harold Martin](https://www.linkedin.com/in/harold-martin-98526971/) - harold.martin at gmail

## Legal

* Based on [chrome-extension-react-typescript-boilerplate](https://github.com/martellaj/chrome-extension-react-typescript-boilerplate) from [martellaj](https://github.com/martellaj)
* Jira and the Jira logo design are registered trademarks of Atlassian.
* Chrome and the Chrome logo design are registered trademarks of Google.
* This is an unofficial Jira plugin is not associated with Atlassian or Google.
* Released under [MIT license](LICENSE).
