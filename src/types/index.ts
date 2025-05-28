// types/index.ts
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
    createdAt: string; // DateTime in string format
    // Client-side captured image for immediate display in history after taking a photo
    userCapturedImageUrl?: string; 
  }
  
  export interface MoodFrameToServer {
    order: string;
    data: ArrayBuffer; // For image buffer
  }
  
  export interface MoodFrameFromServer {
    order: string;
    data: ArrayBuffer; // Assuming server sends back an image buffer
  }