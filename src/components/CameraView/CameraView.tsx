'use client'; // 카메라, 상태 등 클라이언트 사이드 기능을 사용하므로 명시해줍니다.

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import ResultPopup from '../ResultPopup/ResultPopup';
import { HistoryItem, ApiResult } from '@/types'; // 타입 가져오기

interface CameraViewProps {
  // 새로운 히스토리 아이템이 생겼을 때 부모 컴포넌트(page.tsx)에 알리기 위한 함수
  onNewHistoryItem: (item: HistoryItem) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onNewHistoryItem }) => {
  // 비디오, 캔버스 DOM 요소에 접근하기 위해 ref를 사용합니다.
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 컴포넌트의 여러 상태들을 관리합니다.
  const [isCameraReady, setIsCameraReady] = useState(false); // 카메라 준비 상태
  const [isLoading, setIsLoading] = useState(false); // API 통신 중 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [showPopup, setShowPopup] = useState(false); // 결과 팝업 표시 여부
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null); // 팝업에 띄울 캡처된 이미지 (Data URL)
  const [apiResultForPopup, setApiResultForPopup] = useState<ApiResult | null>(null); // 팝업에 띄울 API 결과

  // useEffect를 사용해서 컴포넌트가 마운트되면 카메라 스트림을 가져옵니다.
  useEffect(() => {
    // 이 함수는 비동기로 카메라 접근 권한을 요청하고 비디오 스트림을 설정해요.
    const setupCamera = async () => {
      // 사용자의 브라우저가 mediaDevices API를 지원하는지 먼저 확인합니다.
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("응~ 카메라 지원 안해");
        setIsCameraReady(false);
        return;
      }

      try {
        // 사용자에게 카메라 사용 권한을 요청합니다.
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // 비디오 태그(videoRef)가 존재하면, 스트림을 연결합니다.
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // 비디오 메타데이터가 로드되면 'loadedmetadata' 이벤트가 발생해요.
          // 이때 비디오를 재생시키고 카메라 준비 완료 상태로 변경합니다.
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(playError => {
              console.error("카메라 재생에 실패했어요:", playError);
              setError("카메라를 재생할 수 없어요. 다른 앱에서 사용 중인지 확인해주세요.");
            });
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        // 카메라 접근 권한이 거부되거나 다른 에러가 발생했을 때 처리합니다.
        console.error("카메라 접근에 실패했어요: ", err);
        setError("카메라를 사용하려면 접근 권한이 필요해요.");
        setIsCameraReady(false);
      }
    };

    setupCamera();

    // 컴포넌트가 언마운트될 때 카메라 스트림을 정리해주는 것이 중요해요.
    // 그렇지 않으면 카메라가 계속 켜져 있을 수 있습니다.
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop()); // 모든 트랙을 중지시킵니다.
      }
    };
  }, []); // 빈 배열을 두 번째 인자로 전달해서 컴포넌트 마운트 시 한 번만 실행되도록 합니다.

  // 사진 찍기 버튼을 눌렀을 때 실행되는 함수입니다. useCallback으로 감싸서 불필요한 재생성을 방지해요.
  const handleTakePhoto = useCallback(async () => {
    // 필요한 요소들이 준비되지 않았으면 아무것도 하지 않아요.
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError("카메라가 아직 준비되지 않았거나, 문제가 발생했어요.");
      return;
    }

    setIsLoading(true); // 로딩 시작! 사용자에게 기다려달라는 신호죠.
    setError(null); // 이전 에러 메시지가 있다면 지워줍니다.

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // 캔버스 크기를 비디오 크기와 동일하게 설정합니다.
    // 비디오의 실제 그림 크기(videoWidth, videoHeight)를 사용하는 게 좋아요.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 캔버스에 현재 비디오 프레임을 그립니다.
    const context = canvas.getContext('2d');
    if (!context) {
      setError("캔버스 컨텍스트를 가져올 수 없어요. 이런! 😱");
      setIsLoading(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 캔버스 이미지를 Data URL(base64) 형태로 가져옵니다. 팝업에 보여줄 용도예요.
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImageForPopup(imageDataUrl); // 팝업에 띄울 이미지를 상태에 저장

    // 캔버스 이미지를 Blob 형태로 가져옵니다. API로 전송할 용도예요.
    // toBlob은 비동기 작업이라 Promise로 감싸서 사용하면 편리해요.
    const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));

    if (!imageBlob) {
      setError("이미지 데이터를 Blob으로 변환하는 데 실패했어요.");
      setIsLoading(false);
      return;
    }

    // FormData 객체를 사용해서 이미지를 서버로 전송할 준비를 합니다.
    // 'photo'는 서버와 약속된 필드 이름이어야 해요.
    const formData = new FormData();
    formData.append('photo', imageBlob, 'capture.jpg'); // 'photo'라는 이름으로 이미지 Blob을 추가

    // --- API 통신 부분 ---
    // 이 부분은 나중에 실제 API가 만들어지면 수정해야 해요.
    // 지금은 가상의 API 호출을 시뮬레이션합니다.
    try {
      // TODO: AI 개발자분이 여기에 실제 API 엔드포인트와 로직을 넣어주실 거예요!
      // const response = await fetch('www.example.com/api/celebrity-face', {
      //   method: 'POST',
      //   body: formData, // FormData 객체를 body에 담아 전송
      //   // headers: { 'Authorization': 'Bearer YOUR_API_KEY' } // 필요하다면 인증 헤더 추가
      // });

      // if (!response.ok) {
      //   // 서버에서 에러 응답이 오면 여기서 처리합니다.
      //   const errorData = await response.json().catch(() => ({ message: '알 수 없는 서버 오류' }));
      //   throw new Error(errorData.message || `서버 에러: ${response.status}`);
      // }
      // const result: ApiResult = await response.json(); // 서버 응답을 JSON으로 파싱

      // --- 가상 API 응답 (시뮬레이션) ---
      // 실제 API 연동 전까지 임시로 사용할 데이터입니다.
      console.log("서버로 전송될 이미지 데이터 (Blob):", imageBlob);
      console.log("서버로 전송될 FormData:", formData.get('photo'));
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 딜레이
      const mockResult: ApiResult = {
        celebrityName: "아이유", // 예시 결과
        // celebrityImageUrl: "https://example.com/iu.jpg" // 필요하다면 이런 데이터도 올 수 있겠죠
      };
      // --- 가상 API 응답 끝 ---

      setApiResultForPopup(mockResult); // API 결과를 상태에 저장
      setShowPopup(true); // 결과 팝업을 보여줍니다.

      // 새로운 히스토리 아이템을 생성해서 부모 컴포넌트로 전달합니다.
      const newHistoryEntry: HistoryItem = {
        id: new Date().toISOString(), // 간단하게 현재 시간을 ID로 사용
        submittedImageUrl: imageDataUrl, // 사용자가 찍은 사진 (썸네일용)
        celebrityName: mockResult.celebrityName,
      };
      onNewHistoryItem(newHistoryEntry); // 부모 컴포넌트의 콜백 함수 호출!

    } catch (apiError: any) {
      // 네트워크 오류나 서버 응답 오류 등 API 통신 중 발생하는 모든 에러를 여기서 잡아요.
      console.error("API 통신 중 에러 발생:", apiError);
      setError(apiError.message || "결과를 가져오는 데 실패했어요. 다시 시도해주세요. 😭");
      setCapturedImageForPopup(null); // 에러 발생 시 팝업에 띄울 이미지 초기화
      setApiResultForPopup(null);     // 에러 발생 시 팝업에 띄울 API 결과 초기화
    } finally {
      // API 호출이 성공하든 실패하든 로딩 상태는 해제해줘야 해요.
      setIsLoading(false);
    }

  }, [isCameraReady, onNewHistoryItem]); // 의존성 배열에 isCameraReady와 onNewHistoryItem 추가

  const handleClosePopup = () => {
    setShowPopup(false);
    // 팝업 닫을 때 관련 상태 초기화 해주는게 좋아요. 안그러면 다음 팝업에 이전 데이터가 잠깐 보일 수 있음!
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  // 에러 메시지가 있다면 화면에 보여줍니다.
  if (error && !isLoading) { // 로딩 중에는 에러메시지 대신 로딩스피너가 보이도록
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <div className={styles.cameraContainer}>
      {/* 로딩 중일 때는 스피너를, 아니면 비디오 화면을 보여줍니다. */}
      {isLoading && <LoadingSpinner />}

      {/* 비디오 화면입니다. 처음엔 숨겨져 있다가 카메라 준비가 완료되면 보여요.
        isLoading 상태일 때는 스피너에 가려지도록 스타일을 조정할 수 있습니다.
      */}
      <video
        ref={videoRef}
        className={styles.videoFeed}
        playsInline // iOS에서 전체화면으로 자동 재생되는 것을 방지
        muted // 자동 재생 정책 때문에 음소거는 필수!
        style={{ display: isCameraReady && !isLoading ? 'block' : 'none' }} // 준비되고 로딩중 아닐때만 보이도록
      />
      {/* 카메라가 준비 안됐는데 로딩중도 아닐 때, 안내 메시지 */}
      {!isCameraReady && !isLoading && !error && (
        <div className={styles.preparationMessage}>카메라를 준비하고 있어요... 잠시만요!</div>
      )}


      {/* 사진 찍기 버튼입니다. 카메라가 준비되고, 로딩 중이 아닐 때만 활성화됩니다.
      */}
      {!isLoading && isCameraReady && (
        <button
          onClick={handleTakePhoto}
          className={styles.shutterButton}
          aria-label="사진 찍기"
          disabled={isLoading} // 로딩 중에는 버튼 비활성화
        >
          {/* 셔터 버튼 아이콘이나 텍스트를 넣을 수 있어요. 여기서는 동그라미로. */}
        </button>
      )}

      {/* 결과 팝업입니다. showPopup이 true이고, 필요한 데이터가 있을 때만 렌더링됩니다.
      */}
      {showPopup && capturedImageForPopup && apiResultForPopup && (
        <ResultPopup
          capturedImage={capturedImageForPopup}
          resultText={apiResultForPopup.celebrityName}
          onClose={handleClosePopup}
        />
      )}

      {/* 실제 이미지 처리를 위한 보이지 않는 캔버스입니다.
        CSS로 숨기거나, width/height 0으로 설정할 수 있습니다.
      */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default CameraView;