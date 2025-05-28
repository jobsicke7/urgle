// src/lib/constants.ts
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // 프로덕션에서는 현재 도메인 사용 (Vercel 프록시 활용)
  : 'http://kgh1113.ddns.net'; // 개발환경에서만 직접 연결

export const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? '' // 현재 도메인 사용
  : 'http://kgh1113.ddns.net'; // 개발환경에서는 직접 연결