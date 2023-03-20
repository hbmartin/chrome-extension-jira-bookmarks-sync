import BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
import BookmarkMoveInfo = chrome.bookmarks.BookmarkMoveInfo;

const JQL = 'assignee = currentUser() and statusCategory != Done ORDER BY updatedDate DESC';
const rootFolderKey = "rootFolderKey";
const jiraUrlKey = "jiraUrlKey";

// helper function for wrapping old Google Chrome callback style in a Promise
function $<T>(api): (...args: any) => Promise<T> {
    return (...args: any): Promise<T> => {
        return new Promise<T>((resolve) => {
            api(...args, resolve);
        });
    };
}

// TODO: monitor removed event as well
chrome.bookmarks.onMoved.addListener(function(id: string, moveInfo: BookmarkMoveInfo) {
    console.log(moveInfo);
    // if it's one of our folders but not an issue, move it back (TODO)
    // if it is a ticket, try to transition it
    // 1. request issue and identify correct transition ID
    // if not available, move it back (TODO)
    // 2. if it is, fire POST to Jira
    getOwnedFolders().then(folders => {
        console.log(folders);
        if (!folders) { return null; }
        return Object.keys(folders).find(k => folders[k] == moveInfo.parentId);
    })
        .then(toStatusName => {
            if (toStatusName) {
                chrome.bookmarks.get(id, function(bookmarks: BookmarkTreeNode[]) {
                    if (bookmarks.length != 0) {
                        const url = bookmarks[0].url;
                        const issue = url.split("/").pop().split("#");
                        const issue_name = issue[0];
                        const key = issue[1];
                        chrome.storage.local.get("transitions")
                            .then(data => {
                                console.log(data);
                                const transition = data['transitions'][key][toStatusName];
                                if (transition) {
                                    console.log(`found transitionId: ${transition}`)
                                    transitionIssue(key, transition)
                                        .then(result => {
                                            console.log(result);
                                            if (result.ok) {
                                                chrome.notifications.create({
                                                    "type": "basic",
                                                    "title": `${issue_name} transitioned to ${toStatusName}`,
                                                    "message": "Do or do not. There is no try.",
                                                    "iconUrl": "/icon128.png"
                                                });
                                            } else {
                                                chrome.notifications.create({
                                                    "type": "basic",
                                                    "title": `❌ failed moving ${issue_name} transition to ${toStatusName}`,
                                                    "message": `${result.status} : ${result.statusMessage}`,
                                                    "iconUrl": "/icon128.png"
                                                });
                                            }
                                        })
                                } else {
                                    console.log("TODO: no valid transitions, send this back to whence it came");
                                    chrome.notifications.create({
                                        "type": "basic",
                                        "title": `❌ failed moving ${issue_name} to ${toStatusName}`,
                                        "message": "No valid transitions available",
                                        "iconUrl": "/icon128.png"
                                    });
                                }
                            })
                    }
                });
            } else {
                console.log("TODO: send this back to whence it came");
                chrome.notifications.create({
                    "type": "basic",
                    "title": `❌ failed moving, this isn't a status folder in the Jira Sync Bookmarks`,
                    "message": "Issues can only be moved to other status folders",
                    "iconUrl": "/icon128.png"
                });
            }
        });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    console.log(sender);
    const baseUrl = request["baseUrl"];

    fetch(`${baseUrl}/rest/api/2/permissions`, { method: 'GET' })
        .then(response => {
            console.log(response);
            if (!response.ok) {
                sendResponse(`Verification failed with error: ${response.status} ${response.statusText}`);
            } else {
                chrome.storage.sync.set({ jiraUrlKey: baseUrl }).then(_ => { main(); });
                return sendResponse(null);
            }
        });
    return true;
});

const clearIssueChildBookmarks = function(id: string, existing: string[]): Promise<void[]> {
    return $<BookmarkTreeNode[]>(chrome.bookmarks.getChildren)(id)
        .then(bookmarks => {
            return Promise.all(
                bookmarks.map(bookmark => {
                    if (bookmark["url"]) {
                        // shouldn't have any top-level bookmarks
                        $(chrome.bookmarks.remove)(bookmark["id"]);
                    } else if (existing.includes(bookmark["id"])) {
                        /// clearing nested folder
                        clearIssueChildBookmarks(bookmark["id"], []);
                    } else {
                        // shouldn't have any unknown folders
                        $(chrome.bookmarks.removeTree)(bookmark["id"]);
                    }
                })
            )
        });
}

const createStatusFolders = function(rootFolderId: string, statusNames: string[], oldFolders: Record<string, string>): Promise<Record<string, string>> {
    return Promise.all(
        statusNames.map(statusName =>
            $<BookmarkTreeNode>(chrome.bookmarks.create)({
                "parentId": rootFolderId,
                "title": statusName,
            })
        )
    )
        .then(results => {
            const newFolders = results.reduce<Record<string, string>>((reduced, folder) => {
                reduced[folder["title"]] = folder["id"];
                return reduced;
            },
                {}
            );
            const folders = { ...newFolders, ...oldFolders };
            chrome.storage.sync.set({ "folders": folders });
            return folders;
        });
}

const fetchIssue = function(id: string): Promise<any> {
    return getJiraUrl()
        .then(baseUrl => {
            return fetch(
                `${baseUrl}/rest/api/2/issue/${id}` +
                "?expand=transitions&fields=transitions"
                ,
                {
                    method: 'GET',
                }
            )
        })
        .then(response => {
            return response.json();
        })
};

const transitionIssue = function(issueKey: string, transitionId: string): Promise<any> {
    return getJiraUrl()
        .then(baseUrl => {
            return fetch(
                `${baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
                {
                    method: 'POST',
                    headers: new Headers({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify({ "transition": { "id": transitionId } })
                }
            );
        })
};

const fetchIssues = function(jql: string): Promise<any> {
    return getJiraUrl()
        .then(baseUrl => {
            return fetch(
                `${baseUrl}/rest/api/2/search?maxResults=50` +
                "&expand=transitions" +
                `&jql=${encodeURIComponent(jql)}` +
                `&fields=${encodeURIComponent('summary,issuetype,status,assignee,fixVersions')}`
                ,
                {
                    method: 'GET'
                }
            )
        })
        .then(response => {
            return response.json();
        });
};

const createBookmarksFromIssues = function(rootFolderId: string, issues: any, folderMap: Record<string, string>): Promise<BookmarkTreeNode[]> {
    return getJiraUrl()
        .then(baseUrl => {
            return Promise.all<BookmarkTreeNode>(
                issues.map(issue => {
                    const status = issue['fields']['status']['name'];
                    const title = `[${issue['key']}] ${issue['fields']['summary']}`
                    const url = `${baseUrl}/browse/${issue['key']}#${issue['id']}`
                    return $<BookmarkTreeNode>(chrome.bookmarks.create)({
                        "parentId": folderMap[status] || rootFolderId,
                        "title": title,
                        "url": url
                    });
                })
            )
        });
}

const getJiraUrl = function(): Promise<string> {
    return chrome.storage.sync.get(jiraUrlKey).then(items => { return items[jiraUrlKey] });
}

const getOwnedFolders = function(): Promise<Record<string, string>> {
    return chrome.storage.sync.get("folders").then(items => { return items["folders"] });
}

const getRootFolderId = function(): Promise<string> {
    return chrome.storage.sync.get(rootFolderKey)
        .then(items => {
            if (rootFolderKey in items) {
                return items[rootFolderKey];
            } else {
                return $<BookmarkTreeNode>(chrome.bookmarks.create)({
                    "title": "Jira Issues (Extension)",
                    "parentId": "1",
                })
                    .then(bookmarkTreeNode => {
                        return chrome.storage.sync.set({ rootFolderKey: bookmarkTreeNode.id })
                            .then(_ => bookmarkTreeNode.id);
                    })
            }
        });
}

const isNonEmptyString = (val) => typeof val === 'string' && !!val

const syncJiraToBookmarks = function() {
    getRootFolderId().then(rootFolderId => {
        console.log(`main: getRootFolderId: ${rootFolderId}`);
        getOwnedFolders()
            .then(folders => {
                console.log("folders");
                console.log(folders);
                return clearIssueChildBookmarks(rootFolderId, folders ? Object.values(folders) : [])
                    .then(() => {
                        console.log(`fetching: ${JQL}`);
                        return fetchIssues(JQL);
                    })
                    .then(data => {
                        const statusNames = new Set<string>();
                        data["issues"].forEach(issue => {
                            const status = issue['fields']['status']['name'];
                            statusNames.add(status);
                        });
                        const oldStatuses = folders ? Object.keys(folders) : [];
                        const newStatuses = Array.from(statusNames.values())
                            .filter(status => !oldStatuses.includes(status));
                        return createStatusFolders(rootFolderId, newStatuses, folders)
                            .then(folderMap => {
                                return createBookmarksFromIssues(rootFolderId, data["issues"], { ...folderMap, ...folders });
                            })
                            .then(_ => {
                                const transitionsByIssue = data["issues"].reduce((acc, issue) => {
                                    return {
                                        ...acc,
                                        [issue["id"]]: issue["transitions"].reduce((tacc, t) => {
                                            return {
                                                ...tacc,
                                                [`${t["to"]["name"]}`]: t["id"]
                                            };
                                        }, {})
                                    }
                                }, {});
                                chrome.storage.local.set({ "transitions": transitionsByIssue });
                            });
                    });
            });
    });
}

const main = function(doNotOpenSettings: boolean = false) {
    return getJiraUrl().then(baseUrl => {
        if (isNonEmptyString(baseUrl)) {
            syncJiraToBookmarks();
        } else if (!doNotOpenSettings) {
            chrome.tabs.create({ url: 'popup.html' });
        }
    })
};

chrome.runtime.onInstalled.addListener(_ => {
    console.log("onInstalled");
    main();
});

chrome.runtime.onStartup.addListener(() => {
    console.log("onStartup");
    main();
});

chrome.alarms.onAlarm.addListener(_ => {
    main(true);
});
chrome.alarms.create({ periodInMinutes: 10 });
