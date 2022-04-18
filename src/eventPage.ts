import BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
import BookmarkMoveInfo = chrome.bookmarks.BookmarkMoveInfo;

const bookmark_id = "11624";
const baseUrl = ""
const email = ""
const token = ""
const auth = 'Basic ' + btoa(`${email}:${token}`);
const JQL = 'assignee = currentUser() and statusCategory != Done ORDER BY updatedDate DESC';

function $<T>(api): (...args: any) => Promise<T> {
    return (...args: any): Promise<T> => {
        return new Promise<T>((resolve) => {
            api(...args, resolve);
        });
    };
}

// TODO: monitor removed event as well
chrome.bookmarks.onMoved.addListener(function (id: string, moveInfo: BookmarkMoveInfo) {
    console.log(moveInfo);
    // if it's one of our folders but not an issue, move it back (TODO)
    // if it is a ticket, try to transition it
    // 1. request issue and identify correct transition ID
    // if not available, move it back (TODO)
    // 2. if it is, fire POST to Jira
    getOwnedFolders().then(folders => {
        if (!folders) { return; }
        console.log(folders);
        const toStatusName = Object.keys(folders).find(k => folders[k] == moveInfo.parentId);
        if (toStatusName) {
            chrome.bookmarks.get(id, function (bookmarks: BookmarkTreeNode[]) {
                if (bookmarks.length != 0) {
                    const url = bookmarks[0].url
                    const key = url.split("/").pop()
                    fetchIssue(auth, key)
                        .then(data => {
                            console.log(data);
                            const transition = data['transitions'].find(t => t["to"]["name"] == toStatusName);
                            if (transition) {
                                console.log(`found transitionId: ${transition}`)
                                transitionIssue(auth, key, transition["id"])
                                    .then(result => {
                                        console.log(result);
                                        if (result.ok) {
                                            chrome.notifications.create({
                                                "type": "basic",
                                                "title": `${key} transitioned to ${toStatusName}`,
                                                "message": "Do or do not. There is no try.",
                                                "iconUrl": "notification.png"
                                            });
                                        } else {
                                            chrome.notifications.create({
                                                "type": "basic",
                                                "title": `❌ failed ${key} transition to ${toStatusName}`,
                                                "message": `${result.status} : ${result.statusMessage}`,
                                                "iconUrl": "notification.png"
                                            });
                                        }
                                    })
                            } else {
                                console.log("TODO: no valid transitions, send this back to whence it came");
                                chrome.notifications.create({
                                    "type": "basic",
                                    "title": `❌ failed moving ${key} to ${toStatusName}`,
                                    "message": "No legal transitions available",
                                    "iconUrl": "notification.png"
                                });
                            }
                        })
                }
            });
        } else {
            console.log("TODO: send this back to whence it came");
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // onMessage must return "true" if response is async.
    const isResponseAsync = false;

    if (request.popupMounted) {
        console.log('eventPage notified that Popup.tsx has mounted.');
    }

    return isResponseAsync;
});

const clearBookmarks = function (id: string, existing: string[]): Promise<void[]> {
    return $<BookmarkTreeNode[]>(chrome.bookmarks.getChildren)(id)
        .then(bookmarks => {
            return Promise.all(
                bookmarks.map(bookmark => {
                    if (bookmark["url"]) {
                        // shouldn't have any top-level bookmarks
                        $(chrome.bookmarks.remove)(bookmark["id"]);
                    } else if (existing.includes(bookmark["id"])) {
                        /// clearing nested folder
                        clearBookmarks(bookmark["id"], []);
                    } else {
                        // shouldn't have any unknown folders
                        $(chrome.bookmarks.removeTree)(bookmark["id"]);
                    }
                })
            )
        });
}

const createStatusFolders = function (statusNames: string[]): Promise<Record<string, string>> {
    return Promise.all(
        statusNames.map(statusName =>
            $<BookmarkTreeNode>(chrome.bookmarks.create)({
                "parentId": bookmark_id,
                "title": statusName,
            })
        )
    )
        .then(function (results): Record<string, string> {
            console.log(results);
            const folders = results.reduce<Record<string, string>>((reduced, folder) => {
                    reduced[folder["title"]] = folder["id"];
                    return reduced;
                },
                {}
            );
            chrome.storage.local.set({folders});
            return folders;
        });
}

const fetchIssue = function (auth: string, id: string): Promise<any> {
    return fetch(
        `${baseUrl}/rest/api/2/issue/${id}` +
        "?expand=transitions&fields=transitions"
        ,
        {
            method: 'GET',
            headers: new Headers({
                'Authorization': auth
            }),
        }
    )
        .then(response => {
            return response.json();
        })
};

const transitionIssue = function (auth: string, issueKey: string, transitionId: string): Promise<any> {
    return fetch(
        `${baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
        {
            method: 'POST',
            headers: new Headers({
                'Authorization': auth,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({"transition": {"id": transitionId}})
        }
    );
};

const fetchIssues = function (auth: string, jql: string): Promise<any> {
    return fetch(
        `${baseUrl}/rest/api/2/search?maxResults=50` +
        "&expand=transitions" +
        `&jql=${encodeURIComponent(jql)}` +
        `&fields=${encodeURIComponent('summary,issuetype,status,assignee,fixVersions')}`
        ,
        {
            method: 'GET',
            headers: new Headers({
                'Authorization': auth
            }),
        }
    )
        .then(response => {
            return response.json();
        });
};

const createBookmarksFromIssues = function (issues: any, folderMap: Record<string, string>): Promise<BookmarkTreeNode[]> {
    return Promise.all(
        issues.map(issue => {
            const status = issue['fields']['status']['name'];
            const title = `[${issue['key']}] ${issue['fields']['summary']}`
            const url = `${baseUrl}/browse/${issue['key']}`
            return $(chrome.bookmarks.create)({
                "parentId": folderMap[status] || bookmark_id,
                "title": title,
                "url": url
            });
        })
    )
}

const getOwnedFolders = function(): Promise<Record<string, string>> {
    return new Promise((resolve) => {
        chrome.storage.local.get(storage => {
            resolve(storage["folders"]);
        });
    });
}

const main = function() {
    getOwnedFolders()
        .then(folders => {
            console.log(folders ? folders : "no owned folders");
            return clearBookmarks(bookmark_id, folders ? Object.values(folders) : [])
                .then(() => {
                    return fetchIssues(auth, JQL);
                })
                .then(data => {
                    console.log(data);
                    const statusNames = new Set<string>();
                    data["issues"].forEach(issue => {
                        const status = issue['fields']['status']['name'];
                        statusNames.add(status);
                    });
                    const oldStatuses = folders ? Object.keys(folders) : [];
                    const newStatuses = Array.from(statusNames.values())
                        .filter(status => !oldStatuses.includes(status));
                    return createStatusFolders(newStatuses)
                        .then(folderMap => {
                            console.log(folderMap);
                            console.log(folderMap);
                            return createBookmarksFromIssues(data["issues"], {...folderMap, ...folders});
                        });
                });
        });
}

// TODO: configuration of JIRA bookmark root
chrome.alarms.onAlarm.addListener(function (alarm) {
    console.log("Got an alarm!", alarm);
    // main()
});
chrome.alarms.create({periodInMinutes: 1});

main();