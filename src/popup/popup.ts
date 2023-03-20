function isValidUrl(string: string) {
    try {
        new URL(string);
        return string != "https://XYZ.atlassian.net";
    } catch (err) {
        return false;
    }
}

function validateUrl() {
    console.log("validateUrl");
    (document.getElementById("error_message") as HTMLDivElement).style.display = "none";
    (document.getElementById("success_message") as HTMLDivElement).style.display = "block";
    const baseUrl = (document.getElementById("url_input") as HTMLInputElement).value;
    console.log(baseUrl);
    console.log(isValidUrl(baseUrl));
    (document.getElementById("save") as HTMLButtonElement).disabled = !isValidUrl(baseUrl);
}

function checkAndSaveUrl() {
    (document.getElementById("save") as HTMLButtonElement).disabled = true;
    const baseUrl = (document.getElementById("url_input") as HTMLInputElement).value;
    console.log(baseUrl);
    (async () => {
        const errorMessage = await chrome.runtime.sendMessage({ baseUrl });
        console.log(errorMessage);
        if (errorMessage) {
            const errorDiv = document.getElementById("error_message") as HTMLDivElement;
            errorDiv.innerText = errorMessage;
            errorDiv.style.display = "block";
        } else {
            (document.getElementById("error_message") as HTMLDivElement).style.display = "none";
            (document.getElementById("success_message") as HTMLDivElement).style.display = "block";
        }
    })();
}

(document.getElementById("save") as HTMLButtonElement).onclick = checkAndSaveUrl;
(document.getElementById("url_input") as HTMLInputElement).oninput = validateUrl;
validateUrl();

chrome.storage.sync.get("jiraUrlKey").then(items => {
    if (items.hasOwnProperty("jiraUrlKey")) {
        (document.getElementById("url_input") as HTMLInputElement).value = items["jiraUrlKey"];
    }
});
