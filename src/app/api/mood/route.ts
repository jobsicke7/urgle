// src/app/api/mood/route.ts - 완전히 새로 작성
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = 'http://kgh1113.ddns.net:80';

// 가능한 엔드포인트들을 시도해볼 목록
const POSSIBLE_ENDPOINTS = [
  '/api/mood',
];

export async function POST(req: NextRequest) {
  console.log('🚀 POST 요청 받음 - 프레임 처리 시작');
  
  try {
    const formData = await req.formData();
    const frameFile = formData.get('frame') as File;
    
    if (!frameFile) {
      console.error('❌ 프레임 파일이 없음');
      return NextResponse.json({ error: 'No frame provided' }, { status: 400 });
    }

    console.log('📷 프레임 정보:', {
      name: frameFile.name,
      size: frameFile.size,
      type: frameFile.type,
    });

    // 백엔드로 프록시 요청
    const proxyFormData = new FormData();
    proxyFormData.append('frame', frameFile);

    // 여러 엔드포인트 시도
    for (const endpoint of POSSIBLE_ENDPOINTS) {
      const fullUrl = `${BACKEND_BASE_URL}${endpoint}`;
      console.log(`🔍 시도 중: ${fullUrl}`);
      
      try {
        const backendResponse = await fetch(fullUrl, {
          method: 'POST',
          body: proxyFormData,
          signal: AbortSignal.timeout(10000),
          headers: {
            'User-Agent': 'NextJS-Proxy/1.0',
          },
        });

        console.log(`📡 응답 상태: ${backendResponse.status} ${backendResponse.statusText}`);
        
        if (backendResponse.ok) {
          console.log('✅ 성공한 엔드포인트:', fullUrl);
          
          const contentType = backendResponse.headers.get('content-type');
          console.log('📄 응답 Content-Type:', contentType);
          
          if (contentType?.includes('image')) {
            const processedImageBuffer = await backendResponse.arrayBuffer();
            console.log('🖼️ 이미지 데이터 크기:', processedImageBuffer.byteLength);
            
            return new NextResponse(processedImageBuffer, {
              status: 200,
              headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'no-cache',
              },
            });
          } else {
            // JSON 응답인 경우
            const responseText = await backendResponse.text();
            console.log('📄 텍스트 응답:', responseText);
            
            return NextResponse.json({
              success: true,
              endpoint: fullUrl,
              response: responseText,
            });
          }
        } else {
          console.warn(`❌ ${fullUrl} 실패: ${backendResponse.status}`);
        }
      } catch (fetchError: any) {
        console.warn(`❌ ${fullUrl} 오류:`, fetchError.message);
      }
    }

    // 모든 엔드포인트 실패
    console.error('❌ 모든 엔드포인트 시도 실패');
    return NextResponse.json(
      { 
        error: 'All backend endpoints failed',
        tried_endpoints: POSSIBLE_ENDPOINTS.map(ep => `${BACKEND_BASE_URL}${ep}`),
      }, 
      { status: 502 }
    );

  } catch (error: any) {
    console.error('❌ 프록시 전체 오류:', error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Backend server timeout' }, 
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process frame', details: error.message }, 
      { status: 500 }
    );
  }
}

// 연결 테스트용 GET 엔드포인트 (강화된 디버깅)
export async function GET() {
  console.log('🔍 GET 요청 - 백엔드 연결 테스트 시작');
  
  const testResults: any = {
    status: 'proxy_ready',
    backend_base_url: BACKEND_BASE_URL,
    test_time: new Date().toISOString(),
    endpoint_tests: [],
  };

  // 각 엔드포인트 테스트
  for (const endpoint of POSSIBLE_ENDPOINTS) {
    const fullUrl = `${BACKEND_BASE_URL}${endpoint}`;
    const testResult: any = {
      endpoint: fullUrl,
      method: 'GET',
    };

    try {
      console.log(`🔍 GET 테스트: ${fullUrl}`);
      
      const testResponse = await fetch(fullUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'NextJS-Proxy-Test/1.0',
        },
      });
      
      testResult.status_code = testResponse.status;
      testResult.status_text = testResponse.statusText;
      testResult.content_type = testResponse.headers.get('content-type');
      testResult.success = testResponse.ok;
      
      if (testResponse.ok) {
        const responseText = await testResponse.text();
        testResult.response_preview = responseText.substring(0, 200);
        console.log(`✅ ${fullUrl} 성공:`, testResponse.status);
      } else {
        console.log(`❌ ${fullUrl} 실패:`, testResponse.status);
      }
      
    } catch (error: any) {
      testResult.error = error.message;
      testResult.success = false;
      console.log(`❌ ${fullUrl} 오류:`, error.message);
    }
    
    testResults.endpoint_tests.push(testResult);
  }

  // 추가: 기본 서버 연결 테스트
  try {
    console.log(`🔍 기본 서버 연결 테스트: ${BACKEND_BASE_URL}`);
    const baseResponse = await fetch(BACKEND_BASE_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    testResults.base_server = {
      status_code: baseResponse.status,
      status_text: baseResponse.statusText,
      success: baseResponse.ok,
    };
    
  } catch (error: any) {
    testResults.base_server = {
      error: error.message,
      success: false,
    };
  }

  console.log('📊 테스트 결과:', testResults);
  return NextResponse.json(testResults);
}