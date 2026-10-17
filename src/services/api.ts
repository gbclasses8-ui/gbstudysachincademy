import CryptoJS from 'crypto-js';
import { FALLBACK_BATCHES } from '../data/fallbackBatches';
import { Batch, Lecture, LiveUpcomingVideo, Subject, Topic, VideoStream } from '../types';

const API_BASE_URL = 'https://maxxapi-sa.vercel.app';
const API_KEY = 'Maxxkoogfchahiye@123';
const WORKER_PROXY = 'https://desimaxx.adityalkkumar4321.workers.dev/?url=';
const PDF_VIEWER_BASE = 'https://pdfweb.classx.co.in/pdfjs/web/viewer-new.html?file=';

const AES_KEY = '638udh3829162018';
const DEFAULT_IV = 'fedcba9876543210';

export function decryptUrl(cipherText?: string): string {
  if (!cipherText || typeof cipherText !== 'string') return '';
  const trimmed = cipherText.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  try {
    let encryptedData = trimmed;
    let ivString = DEFAULT_IV;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      encryptedData = parts[0];
      if (parts[1]) {
        try {
          const parsedIv = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(parts[1]));
          if (parsedIv && parsedIv.length > 0) {
            ivString = parsedIv;
          }
        } catch {
          ivString = DEFAULT_IV;
        }
      }
    }

    const key = CryptoJS.enc.Utf8.parse(AES_KEY);
    const iv = CryptoJS.enc.Utf8.parse(ivString);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);

    if (decrypted && decrypted.trim().length > 0) {
      return decrypted.trim();
    }
    return trimmed;
  } catch (err) {
    console.warn('Decryption fallback for:', trimmed.slice(0, 30), err);
    return trimmed;
  }
}

export function extractPdfUrl(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const decrypted = decryptUrl(raw.trim());
  if (decrypted.includes('?file=')) {
    try {
      const urlObj = new URL(decrypted);
      const fileParam = urlObj.searchParams.get('file');
      if (fileParam) return decodeURIComponent(fileParam);
    } catch {
      const match = decrypted.match(/\?file=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
  }
  return decrypted;
}

export function getPdfViewerUrl(pdfUrl?: string): string {
  if (!pdfUrl) return '';
  const cleanUrl = extractPdfUrl(pdfUrl);
  return `${PDF_VIEWER_BASE}${encodeURIComponent(cleanUrl)}`;
}

export function getProxiedStreamUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith(WORKER_PROXY)) return url;
  return `${WORKER_PROXY}${encodeURIComponent(url)}`;
}

async function fetchFromApi<T>(endpoint: string): Promise<T> {
  const directUrl = `${API_BASE_URL}${endpoint}`;
  const proxiedUrl = `${WORKER_PROXY}${encodeURIComponent(directUrl)}`;
  const vercelProxyUrl = `/api/maxx${endpoint.replace(/^\/api/, '')}`;
  const headers = {
    'X-API-Key': API_KEY,
    Accept: 'application/json',
  };

  // 1. Try Vercel edge rewrite proxy (local dev or on Vercel)
  // 2. Try Cloudflare Worker proxy (universal CORS proxy)
  // 3. Try direct API URL
  const candidateUrls = [vercelProxyUrl, proxiedUrl, directUrl];
  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} from ${url}`);
      }

      const json = await response.json();
      if (json && typeof json === 'object' && 'data' in json && json.data !== undefined) {
        return json.data as T;
      }
      return json as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`Failed to fetch from ${endpoint}`);
}

export async function fetchBatches(): Promise<Batch[]> {
  try {
    const data = await fetchFromApi<Batch[]>('/api/my-batches');
    if (Array.isArray(data) && data.length > 0) {
      // Enrich with categories
      return data.map((b) => {
        const fallback = FALLBACK_BATCHES.find((fb) => fb.id === b.id);
        const nameUpper = (b.course_name || '').toUpperCase();
        let category = fallback?.category || 'General';
        if (!fallback) {
          if (nameUpper.includes('CTET')) category = 'CTET';
          else if (nameUpper.includes('KVS') || nameUpper.includes('NVS')) category = 'KVS/NVS';
          else if (nameUpper.includes('BPSC') || nameUpper.includes('TRE')) category = 'BPSC TRE';
          else if (nameUpper.includes('SUPERTET') || nameUpper.includes('UP')) category = 'UP SuperTET';
          else if (nameUpper.includes('TET')) category = 'State TET';
        }
        return {
          ...b,
          category,
          description: fallback?.description || `Complete comprehensive preparation batch for ${b.course_name}.`,
          language: fallback?.language || 'Hindi & English',
        };
      });
    }
  } catch (err) {
    console.warn('Error fetching live batches, using fallback:', err);
  }
  return FALLBACK_BATCHES;
}

export async function fetchSubjects(courseId: string): Promise<Subject[]> {
  try {
    const data = await fetchFromApi<Subject[]>(`/api/subjects?courseid=${encodeURIComponent(courseId)}`);
    if (Array.isArray(data)) {
      return data.sort((a, b) => (Number(a.sortingparam) || 0) - (Number(b.sortingparam) || 0));
    }
  } catch (err) {
    console.warn(`Error fetching subjects for course ${courseId}:`, err);
  }
  return [];
}

export async function fetchTopics(courseId: string, subjectId: string): Promise<Topic[]> {
  try {
    const data = await fetchFromApi<Topic[]>(
      `/api/topics?courseid=${encodeURIComponent(courseId)}&subjectid=${encodeURIComponent(subjectId)}`
    );
    if (Array.isArray(data)) {
      return [...data].sort((a, b) => (Number(a.sortingparam) || 0) - (Number(b.sortingparam) || 0));
    }
  } catch (err) {
    console.warn(`Error fetching topics for course ${courseId}, subject ${subjectId}:`, err);
  }
  return [];
}

export async function fetchVideos(courseId: string, subjectId: string, topicId: string): Promise<Lecture[]> {
  try {
    const data = await fetchFromApi<Lecture[]>(
      `/api/videos?courseid=${encodeURIComponent(courseId)}&subjectid=${encodeURIComponent(subjectId)}&topicid=${encodeURIComponent(topicId)}`
    );
    if (Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn(`Error fetching videos for course ${courseId}, subject ${subjectId}, topic ${topicId}:`, err);
  }
  return [];
}

export async function fetchVideoDetails(courseId: string, videoId: string): Promise<Lecture | null> {
  try {
    const data = await fetchFromApi<Lecture>(
      `/api/video-details?courseid=${encodeURIComponent(courseId)}&videoid=${encodeURIComponent(videoId)}`
    );
    return data;
  } catch (err) {
    console.warn(`Error fetching video details for course ${courseId}, video ${videoId}:`, err);
    return null;
  }
}

export async function fetchLiveUpcoming(courseId: string): Promise<LiveUpcomingVideo[]> {
  try {
    const data = await fetchFromApi<any>(`/api/live-upcoming?courseid=${encodeURIComponent(courseId)}`);
    const results: LiveUpcomingVideo[] = [];
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.live)) results.push(...data.live.map((v: any) => ({ ...v, is_live: true })));
      if (Array.isArray(data.upcoming)) results.push(...data.upcoming.map((v: any) => ({ ...v, is_live: false })));
    }
    return results;
  } catch (err) {
    console.warn(`Error fetching live/upcoming for course ${courseId}:`, err);
    return [];
  }
}

export async function fetchPreviousLiveVideos(courseId: string): Promise<Lecture[]> {
  try {
    const data = await fetchFromApi<Lecture[]>(
      `/api/previous-live-videos?courseid=${encodeURIComponent(courseId)}`
    );
    if (Array.isArray(data)) return data;
  } catch (err) {
    console.warn(`Error fetching previous live videos for course ${courseId}:`, err);
  }
  return [];
}

export function parseVideoStreams(lecture: Lecture, detailed?: Lecture | null): VideoStream[] {
  const target = detailed || lecture;
  const streamMap = new Map<string, VideoStream>();

  const normalizeQuality = (q?: string) => {
    if (!q) return 'Standard';
    const match = q.match(/(\d+p)/i);
    if (match) return match[1].toLowerCase();
    const lower = q.toLowerCase();
    if (lower.includes('high') || lower.includes('1080') || lower.includes('720')) return '720p';
    if (lower.includes('med') || lower.includes('480')) return '480p';
    if (lower.includes('low') || lower.includes('360')) return '360p';
    if (lower.includes('240')) return '240p';
    return q.trim();
  };

  // 1. Check download links
  const downloadLinks = target.download_links || lecture.download_links || [];
  if (Array.isArray(downloadLinks) && downloadLinks.length > 0) {
    for (const dl of downloadLinks) {
      const path = dl.path || dl.backup_url || dl.backup_url2;
      if (path) {
        const decrypted = decryptUrl(path);
        if (decrypted) {
          const q = normalizeQuality(dl.quality || dl.bitrate);
          const isM3u8 = decrypted.includes('.m3u8');
          if (!streamMap.has(q) || (!streamMap.get(q)!.isM3u8 && isM3u8)) {
            streamMap.set(q, { label: q, url: decrypted, isM3u8 });
          }
        }
      }
    }
  }

  // 2. Check livestream links
  const livestreamLinks = target.livestream_links || lecture.livestream_links || [];
  if (streamMap.size === 0 && Array.isArray(livestreamLinks) && livestreamLinks.length > 0) {
    for (const ls of livestreamLinks) {
      if (ls.path) {
        const decrypted = decryptUrl(ls.path);
        if (decrypted) {
          const q = normalizeQuality(ls.quality || 'Live');
          const isM3u8 = decrypted.includes('.m3u8');
          if (!streamMap.has(q)) {
            streamMap.set(q, { label: q, url: decrypted, isM3u8 });
          }
        }
      }
    }
  }

  // 3. Fallback to file_link or download_link
  if (streamMap.size === 0) {
    const rawLink = target.file_link || lecture.file_link || target.download_link || lecture.download_link;
    if (rawLink) {
      const decrypted = decryptUrl(rawLink);
      if (decrypted) {
        streamMap.set('360p', {
          label: '360p',
          url: decrypted,
          isM3u8: decrypted.includes('.m3u8'),
        });
      }
    }
  }

  const streams = Array.from(streamMap.values());
  const parseRes = (label: string) => {
    const parsed = parseInt(label.replace(/\D/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Sort descending by resolution (720p > 480p > 360p > 240p)
  streams.sort((a, b) => parseRes(b.label) - parseRes(a.label));
  return streams;
}
