const URL_REGEX = new RegExp("https://files\.redgifs\.com/[^.]+\.m4s$", "m");

chrome.action.onClicked.addListener((tab) => {
    const u = new URL(tab.url);
    const gifname = u.pathname.split("/")[2];
    if (gifname) {
        const playlist = `https://api.redgifs.com/v2/gifs/${gifname}/sd.m3u8`;
        console.log(`fetching playlist: ${playlist}`);
        fetch(playlist).then((response) => response.text())
        .then((text) => {
            const matches = URL_REGEX.exec(text);
            if (matches) {
                const videoUrl = matches[0];
                const filename = videoUrl.split("/").pop();
                const gifNameCaps = filename.split(".")[0];
                console.log(`downloading ${gifNameCaps} from ${videoUrl}`);
                chrome.downloads.download({url: videoUrl, filename: `${gifNameCaps}.mp4`});
            }
        });
    }
});
