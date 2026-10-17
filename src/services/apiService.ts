import { Batch, CourseOverview, FolderItem, VideoMediaData } from '../types';
import { INITIAL_BATCHES } from '../data/batchesData';

const BASE_URL = 'https://nt.studybeepro.site';

// Session memory cache to prevent duplicate fetches & speed up browsing
const folderCache = new Map<string, FolderItem[]>();
const overviewCache = new Map<number | string, CourseOverview>();
const mediaCache = new Map<string, VideoMediaData>();

async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // First try relative URL (which uses Vite proxy in dev/server)
  try {
    const res = await fetch(endpoint, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      return res;
    }
  } catch {
    // Relative request failed, proceed to direct URL
  }

  // Fallback to direct BASE_URL with CORS *
  const directUrl = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  return await fetch(directUrl, options);
}

export async function fetchBatches(): Promise<Batch[]> {
  try {
    const res = await fetchWithFallback('/batches.json');
    if (!res.ok) throw new Error('Failed to load live batches');
    const data = await res.json();
    const rawList = [...(data.new || []), ...(data.old || [])];
    if (Array.isArray(rawList) && rawList.length > 0) {
      // Merge with our enriched metadata (badges, categories)
      return INITIAL_BATCHES.map((initial) => {
        const found = rawList.find((b: any) => String(b.id) === String(initial.id));
        if (found) {
          return {
            ...initial,
            title: found.title || initial.title,
            thumbnail: found.thumbnail || initial.thumbnail,
          };
        }
        return initial;
      });
    }
  } catch (err) {
    console.warn('Using bundled initial batches dataset:', err);
  }
  return INITIAL_BATCHES;
}

export async function fetchCourseOverview(courseId: number | string): Promise<CourseOverview | null> {
  if (overviewCache.has(courseId)) {
    return overviewCache.get(courseId)!;
  }

  try {
    const res = await fetchWithFallback(`/api/nig?overview=${courseId}&_t=${Date.now()}`);
    if (!res.ok) throw new Error('Overview HTTP error');
    const json = await res.json();
    if (json.success && json.data) {
      const overviewTab = json.data.find((d: any) => d.type === 'overview');
      const detailsSection = overviewTab?.data?.find((l: any) => l.layout_type === 'details');
      const courseDetails = detailsSection?.layout_data?.[0];
      const extraTab = json.data.find((d: any) => d.type === 'extra_overview');

      const overview: CourseOverview = {
        id: Number(courseId),
        title: courseDetails?.title || `Batch ${courseId}`,
        description: courseDetails?.description || '',
        thumbnail: courseDetails?.thumbnail || '',
        mrp: courseDetails?.mrp,
        offer_price: courseDetails?.offer_price,
        is_new: courseDetails?.is_new,
        is_trending: courseDetails?.is_trending,
        timeTableTitle: extraTab?.title || 'Schedule & Time Table',
        timeTableHtml: extraTab?.description || '',
      };

      overviewCache.set(courseId, overview);
      return overview;
    }
  } catch (err) {
    console.error(`Error loading overview for course ${courseId}:`, err);
  }

  // Fallback to initial batch info
  const initial = INITIAL_BATCHES.find((b) => String(b.id) === String(courseId));
  if (initial) {
    return {
      id: initial.id,
      title: initial.title,
      description: initial.description,
      thumbnail: initial.thumbnail,
    };
  }

  return null;
}

export async function fetchFolderContent(
  courseId: number | string,
  folderId: string | number = 0
): Promise<FolderItem[]> {
  const cacheKey = `${courseId}_${folderId}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  try {
    const res = await fetchWithFallback(`/api/nig?content=${courseId}&folder=${folderId}&_t=${Date.now()}`);
    if (!res.ok) throw new Error('Content HTTP error');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      folderCache.set(cacheKey, json.data);
      return json.data;
    }
  } catch (err) {
    console.error(`Error fetching folder ${folderId} for course ${courseId}:`, err);
  }

  return [];
}

export async function resolveMediaContent(
  courseId: number | string,
  contentId: string | number
): Promise<VideoMediaData | null> {
  const cacheKey = `${courseId}_${contentId}`;
  if (mediaCache.has(cacheKey)) {
    return mediaCache.get(cacheKey)!;
  }

  try {
    const res = await fetchWithFallback(`/api/god?content_id=${contentId}&course_id=${courseId}&_t=${Date.now()}`);
    if (!res.ok) throw new Error('Failed to resolve media stream');
    const json = await res.json();
    const mediaData = json.decryptedData || json.data || {};

    const hasDrmDetails =
      json.drm_details?.status === true &&
      json.drm_details?.data?.link?.file_url;

    const fileUrl = hasDrmDetails
      ? json.drm_details.data.link.file_url
      : mediaData.file_url || deepFindUrl(mediaData) || '';

    let parsedDownloads: Array<{ title: string; url: string }> = [];
    if (mediaData.download_urls) {
      if (typeof mediaData.download_urls === 'string') {
        try {
          parsedDownloads = JSON.parse(mediaData.download_urls);
        } catch {
          // ignore parsing error
        }
      } else if (Array.isArray(mediaData.download_urls)) {
        parsedDownloads = mediaData.download_urls;
      }
    }

    const resolved: VideoMediaData = {
      id: contentId,
      title: mediaData.title || 'Educational Lecture',
      description: mediaData.description,
      thumbnail: mediaData.thumbnail,
      file_url: fileUrl,
      file_type: mediaData.file_type,
      video_type: mediaData.video_type,
      duration: mediaData.duration,
      is_live: mediaData.is_live,
      download_urls: parsedDownloads,
      drm_details: json.drm_details,
    };

    mediaCache.set(cacheKey, resolved);
    return resolved;
  } catch (err) {
    console.error(`Media resolution error for content ${contentId}:`, err);
    return null;
  }
}

function deepFindUrl(obj: any): string | null {
  if (!obj) return null;
  const commonKeys = ['file_url', 'url', 'link', 'pdf_link', 'videoUrl', 'aws_url', 'pdf_url'];
  for (const key of commonKeys) {
    if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 5) {
      return obj[key];
    }
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const found = deepFindUrl(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

export async function fetchLiveClasses(
  courseId: number | string,
  typeCode: '0' | '1' | '2' = '1'
): Promise<any[]> {
  try {
    const res = await fetchWithFallback(
      `/api/play?action=classes&type=${typeCode}&course_id=${courseId}&_t=${Date.now()}`
    );
    if (!res.ok) throw new Error(`Live API error: ${res.status}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.warn(`Error fetching live classes (type=${typeCode}) for course ${courseId}:`, err);
  }
  return [];
}

