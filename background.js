const URL_REGEX = new RegExp("https://(files|media).redgifs.com/[^.]+.(m4s|mp4)$", "m");
const POSTER_REGEX = new RegExp("https://(files|media).redgifs.com/[^.]+.(jpg)$", "m");

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

function checkVideoURLFromPoster() {
  const poster = document.querySelector(".GifPreview_isActive .Player-Poster");
  if (poster && poster.hasAttribute("src")) {
    const src = poster.getAttribute("src");
    if (src) {
      // We'll check if it matches the regex in the main script.
      return src;
    }
  }
  return null;
}

function checkRedditpURL() {
  const link = document.getElementById('navboxLink');
  if (link && link.hasAttribute("href")) {
    const src = link.getAttribute("href");
    if (src) {
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

function isRedditP(url) {
  return url.hostname.endsWith('redditp.com') || url.host == 'redditp.meerkat-boa.ts.net';
}

async function findVideoFromPosterSrc(tab) {
  console.log('Trying poster src…');
  let injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkVideoURLFromPoster,
    });
    for (const { frameId, result } of injectionResults) {
      if (result && POSTER_REGEX.test(result)) {
        let u = new URL(result);
        let gifname = u.pathname.substring(1).split('-')[0];
        if (gifname) {
          return gifname.toLowerCase();
        }
      }
    }
  return null;
}

async function getGifName(tab) {
  let u = new URL(tab.url);
  if (isRedditP(u)) {
    console.log('Trying redditp detection…');
    // TODO: use chrome.webNavigation.getAllFrames to find redgifs frame, go from there.
    // requires "webNavigation" permission in manifest.
    let injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkRedditpURL,
    });
    for (const { frameId, result } of injectionResults) {
      if (result) {
        u = new URL(result);
        break;
      }
    }
  }
  if (u.hostname.endsWith('redgifs.com')) {
    if (u.pathname.startsWith('/watch/')) {
      return u.pathname.split("/")[2];
    } else {
      // See if we can get it from the poster image.
      let gifname = await findVideoFromPosterSrc(tab);
      if (gifname) {
        return gifname;
      }
    }
  } else {
    return null;
  }
}

async function findVideoFromVideoSrc(tab) {
  let injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkVideoURL,
    });
    for (const { frameId, result } of injectionResults) {
      // If we found it via <video src=""> then we're done!
      //console.log(`checkVideoURL returned: '${result}'`);
      if (result && URL_REGEX.test(result)) {
        return result;
      }
    }
  return null;
}

async function findAndDownloadVideo(tab) {
  const u = new URL(tab.url);
  if (u.hostname.endsWith('redgifs.com')) {
    // First, see if the video player has a `src` attribute (this is the easy case)
    let result = await findVideoFromVideoSrc(tab);
    if (result) {
      downloadVideo(result);
      return;
    }
  }

  // Otherwise, fetch the playlist and get the video URL from it.
  const gifname = await getGifName(tab);
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
