// src/utils/mediaUpload.js
// Picks photos and a video from the phone gallery and uploads them to Cloudinary (for product reviews).

import { Platform } from 'react-native';

const CLOUDINARY_CLOUD_NAME = 'roit6yup';
const CLOUDINARY_UPLOAD_PRESET = 'IMAGES';

export const MAX_PHOTOS = 5;
export const MAX_VIDEO_SECONDS = 30;
export const MAX_VIDEO_MB = 40;

// Returns a message when the video is too big or too long, or '' when it is fine
export function checkVideo(asset) {
  if (asset.fileSize && asset.fileSize > MAX_VIDEO_MB * 1024 * 1024) {
    return `The video is too large (${MAX_VIDEO_MB} MB maximum). Please choose a shorter video.`;
  }
  if (asset.duration && asset.duration > (MAX_VIDEO_SECONDS + 1) * 1000) {
    return `The video is too long (${MAX_VIDEO_SECONDS} seconds maximum). Please choose a shorter video.`;
  }
  return '';
}

// Opens the gallery. kind is 'photo' (several at once) or 'video' (one).
// Returns a list of { uri, type, asset }. The list is empty when the customer cancels.
export async function pickMedia(kind, remaining) {
  // The picker is loaded only when it is needed, so the app still works if the package has a problem on a phone
  let ImagePicker;
  try {
    ImagePicker = require('expo-image-picker');
  } catch (err) {
    throw new Error('The photo picker is not available on this phone right now.');
  }

  const options = kind === 'video'
    ? { mediaTypes: ['videos'], allowsMultipleSelection: false, quality: 0.7 }
    : { mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, remaining), quality: 0.7 };

  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];

  return result.assets.map((asset) => {
    if (kind === 'video') {
      const problem = checkVideo(asset);
      if (problem) throw new Error(problem);
    }
    return { uri: asset.uri, type: kind === 'video' ? 'video' : 'image', asset };
  });
}

// Sends the form to Cloudinary and reports the progress (0-100) while the file goes up
function sendForm(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 5 * 60 * 1000; // a video on a slow connection may take a few minutes
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch (err) { /* not JSON */ }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('The upload took too long'));
    xhr.send(formData);
  });
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uploads one picked file. Returns { url, type } to send to the server.
// It tries up to 3 times when the connection fails (the 3rd try reads the file in a different way).
// If Cloudinary itself refuses the file, its own message is shown right away.
export async function uploadReviewMedia(item, onProgress) {
  const isVideo = item.type === 'video';
  const asset = item.asset || {};
  const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
  const name = asset.fileName || (isVideo ? 'review.mp4' : 'review.jpg');
  const address = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload`;

  const makeForm = (file, fileName) => {
    const form = new FormData();
    if (fileName) form.append('file', file, fileName);
    else form.append('file', file);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    return form;
  };
  const readFile = async () => (await fetch(item.uri)).blob();
  // On a phone, the file is sent as { uri, type, name }. A web browser does not understand that (Cloudinary then says
  // "unsupported source: URL [object Object]"), so in the browser the real file is read and sent.
  const attempts = Platform.OS === 'web'
    ? [
        async () => makeForm(await readFile(), name),
        async () => makeForm(await readFile(), name),
        async () => makeForm(await readFile(), name),
      ]
    : [
        async () => makeForm({ uri: item.uri, type: mimeType, name }),
        async () => makeForm({ uri: item.uri, type: mimeType, name }),
        async () => makeForm(await readFile()),
      ];

  let lastError = new Error('unknown problem');
  for (let i = 0; i < attempts.length; i++) {
    try {
      const form = await attempts[i]();
      const { data } = await sendForm(address, form, onProgress);
      if (data.secure_url) return { url: data.secure_url, type: isVideo ? 'video' : 'image' };
      const refused = new Error((data.error && data.error.message) || 'Could not upload the file.');
      refused.final = true; // Cloudinary answered, so trying again will not help
      throw refused;
    } catch (err) {
      if (err.final) throw err;
      lastError = err;
      if (i < attempts.length - 1) await pause(800);
    }
  }

  const size = asset.fileSize ? `, ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '';
  throw new Error(`Cannot upload right now. Please check your internet connection and try again. (${isVideo ? 'video' : 'photo'}${size}: ${lastError.message})`);
}