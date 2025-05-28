// types/index.ts

// 히스토리 아이템 하나를 나타내는 타입이에요.
// 나중에 API 응답 결과에 맞춰서 더 상세하게 정의할 수 있겠죠?
export interface HistoryItem {
    id: string; // 각 아이템을 구별하기 위한 고유 ID
    submittedImageUrl: string; // 사용자가 제출한 이미지 URL (표시용)
    celebrityName: string; // 닮은 연예인 이름 (결과)
    // resultImageUrl?: string; // 연예인 이미지 URL (필요하다면 추가)
  }
  
  // API로부터 받을 예상 결과 타입
  // 지금은 간단하게 만들었지만, 실제 API 스펙에 따라 필드가 추가되거나 변경될 수 있어요.
  export interface ApiResult {
    celebrityName: string;
    // confidenceScore?: number; // 얼마나 닮았는지 점수 (예시)
    // celebrityImageUrl?: string; // 찾은 연예인 이미지 URL (예시)
  }