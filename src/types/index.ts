export interface UploadResponse {
  url: string;
}

export interface LookAlikeResult {
  alike: string;
  percentage: number;
  resultImgUrl: string;
}

export interface HistoryItem extends LookAlikeResult {
  id: string;
  createdAt: string;
  imgUrl: string;
  userCapturedImageUrl?: string;
}

export interface MoodFrameToServer {
  order: string;
  data: ArrayBuffer;
}

export interface MoodFrameFromServer {
  order: string;
  data: ArrayBuffer;
}