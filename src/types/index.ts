export interface Batch {
  id: string;
  course_name: string;
  course_thumbnail: string;
  category?: string;
  description?: string;
  faculty?: string;
  language?: string;
}

export interface Subject {
  subjectid: string;
  subject_name: string;
  subject_logo: string;
  sortingparam?: string | number;
  is_paid?: string;
}

export interface Topic {
  topicid: string;
  topic_name: string;
  topic_logo?: string;
  sortingparam?: string | number;
}

export interface DownloadLink {
  path?: string;
  backup_url?: string;
  backup_url2?: string;
  quality?: string;
  bitrate?: string;
}

export interface LivestreamLink {
  path?: string;
  quality?: string;
}

export interface Lecture {
  id: string;
  Title: string;
  material_type?: string;
  file_link?: string;
  download_link?: string;
  download_links?: DownloadLink[];
  livestream_links?: LivestreamLink[];
  pdf_link?: string;
  pdf_link2?: string;
  duration?: string | number;
  topic_name?: string;
  subject_name?: string;
  hls_stream_type?: string;
  enc_type?: string;
  uhs_version?: string;
  is_live?: boolean;
  live_status?: string | number;
  date_and_time?: string;
  start_date?: string;
  end_date?: string;
  faculty_name?: string;
  thumbnail?: string;
  exam?: string;
}

export interface VideoStream {
  label: string;
  url: string;
  isM3u8: boolean;
}

export interface TimedNote {
  id: string;
  videoId: string;
  timeSeconds: number;
  formattedTime: string;
  text: string;
  createdAt: number;
}

export interface LiveUpcomingVideo extends Lecture {
  title?: string;
}
