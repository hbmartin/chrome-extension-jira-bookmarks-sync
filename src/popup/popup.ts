function isValidUrl(string) {
    try {
        new URL(string);
        return string != "https://XYZ.atlassian.net";
    } catch (err) {
        return false;
    }
}

function validateUrl() {
    console.log("validateUrl");
    let baseUrl = (document.getElementById("url_input") as HTMLInputElement).value;
    console.log(baseUrl);
    console.log(isValidUrl(baseUrl));
    (document.getElementById("save") as HTMLButtonElement).disabled = !isValidUrl(baseUrl);
}

function checkAndSaveUrl() {
    let baseUrl = (document.getElementById("url_input") as HTMLInputElement).value;
    console.log(baseUrl);

    chrome.runtime.sendMessage({ baseUrl });
}

(document.getElementById("save") as HTMLButtonElement).onclick = checkAndSaveUrl;
(document.getElementById("url_input") as HTMLInputElement).oninput = validateUrl;
