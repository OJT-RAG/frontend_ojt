import { clsx } from "clsx";

export function cn(...inputs) {
  return clsx(inputs);
}

export function normalizeGoogleDriveImageUrl(url) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return '';

  // Already a direct googleusercontent image URL
  if (/^https?:\/\/lh3\.googleusercontent\.com\//i.test(raw)) return raw;

  // Common Drive share formats:
  // - https://drive.google.com/file/d/<id>/view?usp=sharing
  // - https://drive.google.com/open?id=<id>
  // - https://drive.google.com/uc?id=<id>&export=download
  // Convert to an image-friendly URL that <img> can render.
  // NOTE: The /file/d/.../view share URL often redirects to a HTML page (or a login screen)
  // which won't render in <img>. The thumbnail endpoint is more reliable for images.
  let fileId = '';

  const filePathMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch?.[1]) fileId = filePathMatch[1];

  if (!fileId) {
    const idParamMatch = raw.match(/[?&#]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch?.[1]) fileId = idParamMatch[1];
  }

  if (fileId) {
    // This redirects to a final lh3.googleusercontent.com URL.
    // Pick a reasonably large size for avatars.
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return raw;
}

export function pickAvatarUrl(userLike) {
  if (!userLike || typeof userLike !== 'object') return '';

  const raw =
    userLike.avatarUrl ||
    userLike.avatarURL ||
    userLike.avatar_url ||
    userLike.AvatarUrl ||
    userLike.AvatarURL ||
    userLike.photoURL ||
    userLike.picture ||
    '';

  return normalizeGoogleDriveImageUrl(raw);
}
