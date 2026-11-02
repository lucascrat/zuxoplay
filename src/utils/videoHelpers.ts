/**
 * Video URL helper utilities
 * Supports direct MP4/WebM videos and YouTube / YouTube Shorts embeds
 */

export interface VideoSourceInfo {
  isYouTube: boolean;
  embedUrl?: string;
  directUrl?: string;
  videoId?: string;
}

/**
 * Extracts YouTube video ID from standard watch URLs, short youtu.be, or YouTube Shorts
 * Examples supported:
 * - https://www.youtube.com/shorts/5v4pP8uQ3o0
 * - https://youtube.com/shorts/5v4pP8uQ3o0?feature=share
 * - https://www.youtube.com/watch?v=5v4pP8uQ3o0
 * - https://youtu.be/5v4pP8uQ3o0
 * - https://www.youtube.com/embed/5v4pP8uQ3o0
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // 1. YouTube Shorts: /shorts/<id>
  const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  // 2. youtu.be/<id>
  const youtuBeMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return youtuBeMatch[1];
  }

  // 3. youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?.*?v=)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // 4. youtube.com/embed/<id>
  const embedMatch = trimmed.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  return null;
}

/**
 * Parses any video URL to determine if it should render via native <video> or <iframe>
 */
export function parseVideoSource(url: string, isMuted: boolean = true): VideoSourceInfo {
  if (!url) {
    return { isYouTube: false };
  }

  const ytId = extractYouTubeId(url);
  if (ytId) {
    const muteParam = isMuted ? 1 : 0;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`;
    return {
      isYouTube: true,
      embedUrl,
      videoId: ytId
    };
  }

  return {
    isYouTube: false,
    directUrl: url
  };
}
