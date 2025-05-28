// src/lib/constants.ts
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // 프로덕션에서는 현재 도메인 사용 (Vercel 프록시 활용)
  : 'http://kgh1113.ddns.net'; // 개발환경에서만 직접 연결

// src/components/CameraView/CameraView.tsx에서 수정할 부분들:

// 1. Socket.IO 연결 부분 (이미 수정되어 있음)
const socketUrl = process.env.NODE_ENV === 'production' 
  ? window.location.origin  // 현재 도메인 사용
  : 'http://kgh1113.ddns.net'; // 개발환경에서는 직접 연결

// 2. API 요청 부분에서 절대 경로 사용
const formData = new FormData();
// Define fileInput as a reference to an HTML file input element
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

if (fileInput && fileInput.files && fileInput.files[0]) {
  formData.append('file', fileInput.files[0]); // Example usage of formData
} else {
  throw new Error('File input element or file not found.');
}

const uploadRes = await fetch(`${API_BASE_URL}/api/look-alike/upload`, {
  method: 'POST',
  body: formData,
});

if (uploadRes.ok) {
  const uploadResult = await uploadRes.json();

  const lookAlikeRes = await fetch(`${API_BASE_URL}/api/look-alike`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imgUrl: uploadResult.url }),
  });

  if (lookAlikeRes.ok) {
    const lookAlikeData = await lookAlikeRes.json();
    console.log(lookAlikeData); // Example usage of lookAlikeRes
  }
}

// src/app/page.tsx에서도 동일하게 수정
const response = await fetch(`${API_BASE_URL}/api/look-alike`);
if (response.ok) {
  const responseData = await response.json();
  console.log(responseData); // Example usage of response
}