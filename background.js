const URL_REGEX = new RegExp("https://(files|media).redgifs.com/[^.]+.(m4s|mp4)$", "m");

function checkVideoURL() {
  const player = document.querySelector(".Player-Video > video");
  if (player && player.hasAttribute("src")) {
    const src = player.getAttribute("src");
    if (src) {
      // We'll check if it matches the regex in the main script.
      return src;
    }
  }
  return null;
}

async function filenameMaybePrefixed(filename) {
  const KEY = "downloadSubDirectory";
  const result = await chrome.storage.local.get(KEY);
  if (KEY in result) {
        return result[KEY] + "/" + filename;
  }
  return filename;
}

async function downloadVideo(videoUrl) {
  const videoBaseName = videoUrl.split("/").pop();
  const gifNameCaps = videoBaseName.split(".")[0];
  const filename = await filenameMaybePrefixed(`${gifNameCaps}.mp4`);
  console.log(`downloading ${gifNameCaps} from ${videoUrl} to ${filename}`);
  chrome.downloads.download({ url: videoUrl, filename });
}

async function findAndDownloadVideo(tab) {
  // First, see if the video player has a `src` attribute (this is the easy case)
  let injectionResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: checkVideoURL,
  });
  for (const { frameId, result } of injectionResults) {
    // If we found it via <video src=""> then we're done!
    //console.log(`checkVideoURL returned: '${result}'`);
    if (result && URL_REGEX.test(result)) {
      downloadVideo(result);
      return;
    }
  }

  // Otherwise, fetch the playlist and get the video URL from it.
  const u = new URL(tab.url);
  const gifname = u.pathname.split("/")[2];
  if (gifname) {
    const playlist = `https://api.redgifs.com/v2/gifs/${gifname}/sd.m3u8`;
    console.log(`fetching playlist: ${playlist}`);
    let response = await fetch(playlist);
    let text = await response.text();
    const matches = URL_REGEX.exec(text);
    if (matches) {
      const videoUrl = matches[0];
      downloadVideo(videoUrl);
    } else {
      console.error(
        `Didn't find any video matches. Playlist contents:\n${text}`
      );
    }
  } else {
    console.error(`Couldn't determine gif name for URL: ${tab.url}`);
  }
}

chrome.action.onClicked.addListener((tab) => {
  findAndDownloadVideo(tab);
});
