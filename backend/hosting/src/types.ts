export interface LatestFile {
  updatedAt?: string;
  totalItems?: number;
  urls?: string[];
}

export interface Post {
  date?: number;
  content?: string;
  image?: string;
  sourceUrl: string;
}