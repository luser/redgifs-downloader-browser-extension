const KEY = "downloadSubDirectory";

document.addEventListener("DOMContentLoaded", () => {
    const destination = document.getElementById("destination");
    destination.addEventListener("change", (e) => {
        if (destination.value) {
            const values = {};
            values[KEY] = destination.value;
            chrome.storage.local.set(values);
        } else {
            chrome.storage.local.remove(KEY);
        }
    }, false);
    chrome.storage.local.get(KEY, (result) => {
        if (KEY in result) {
            destination.value = result[KEY];
        }
    });
});

