'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'; // LoadingSpinner 이름 변경 (충돌 방지)
import ResultPopup from '../ResultPopup/ResultPopup';
import { HistoryItem, ApiResult } from '@/types';

// face-api.js import
import * as faceapi from 'face-api.js';

interface CameraViewProps {
  onNewHistoryItem: (item: HistoryItem) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onNewHistoryItem }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // API 통신 로딩
  const [isModelsLoading, setIsModelsLoading] = useState(true); // 모델 로딩 상태
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
  const [apiResultForPopup, setApiResultForPopup] = useState<ApiResult | null>(null);

  // 모델 로드 및 카메라 스트림 설정
  useEffect(() => {
    const loadModels = async () => {
      try {
        // public 폴더에 face-api 모델 파일들을 배치해야 합니다.
        // 예: public/models/tiny_face_detector_model-weights_manifest.json 등
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        console.log("Face-api.js 모델 로드 완료!");
        setIsModelsLoading(false);
      } catch (err) {
        console.error("Face-api.js 모델 로드 실패:", err);
        setError("AI 모델 로드에 실패했어요. 😢");
        setIsModelsLoading(false);
      }
    };

    const setupCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("카메라 지원 안함.");
        setIsCameraReady(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(playError => {
              console.error("카메라 재생 실패:", playError);
              setError("카메라를 재생할 수 없어요. 다른 앱에서 사용 중인지 확인해주세요.");
            });
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error("카메라 접근 실패: ", err);
        setError("카메라를 사용하려면 접근 권한이 필요해요.");
        setIsCameraReady(false);
      }
    };

    // 모델 로드가 완료된 후에 카메라를 설정
    loadModels().then(() => {
      setupCamera();
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 실시간 얼굴 감지 및 감정 분석 (모델 로드 및 카메라 준비 후)
  useEffect(() => {
    if (!isCameraReady || isModelsLoading || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error("캔버스 컨텍스트를 가져올 수 없어요.");
      return;
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    // 비디오 크기가 0이면 아직 메타데이터 로딩 전이므로 처리 중지
    if (displaySize.width === 0 || displaySize.height === 0) {
      return;
    }
    faceapi.matchDimensions(canvas, displaySize);

    const detectFaces = async () => {
      if (video.paused || video.ended) { // 비디오가 정지되거나 끝나면 루프 중단
        return;
      }

      // 얼굴 감지 옵션 설정 (TinyFaceDetector 사용)
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();

      // 감지된 결과를 캔버스 크기에 맞게 조정
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // 캔버스 초기화
      context.clearRect(0, 0, canvas.width, canvas.height);

      // 바운딩 박스 그리기
      faceapi.draw.drawDetections(canvas, resizedDetections);

      // 감정 표현 그리기
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

      // 다음 프레임 요청
      requestAnimationFrame(detectFaces);
    };

    // 비디오 재생 시작 시 감지 시작
    video.addEventListener('play', detectFaces);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      video.removeEventListener('play', detectFaces);
    };
  }, [isCameraReady, isModelsLoading]);


  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady || isModelsLoading) {
      setError("카메라가 아직 준비되지 않았거나, AI 모델 로딩 중입니다.");
      return;
    }

    setIsLoading(true); // API 통신 로딩 시작
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // 캔버스 크기를 비디오 스트림의 실제 크기와 동일하게 설정
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setError("캔버스 컨텍스트를 가져올 수 없어요.");
      setIsLoading(false);
      return;
    }

    // 비디오 프레임을 캔버스에 그립니다.
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImageForPopup(imageDataUrl);

    const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));

    if (!imageBlob) {
      setError("이미지 데이터를 Blob으로 변환하는 데 실패했어요.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('photo', imageBlob, 'capture.jpg');

    try {
      // TODO: 여기에 실제 API 엔드포인트와 로직을 넣어주세요!
      console.log("서버로 전송될 이미지 데이터 (Blob):", imageBlob);
      console.log("서버로 전송될 FormData:", formData.get('photo'));
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 딜레이 시뮬레이션
      const mockResult: ApiResult = {
        celebrityName: "아이유", // 예시 결과
      };

      setApiResultForPopup(mockResult);
      setShowPopup(true);

      const newHistoryEntry: HistoryItem = {
        id: new Date().toISOString(),
        submittedImageUrl: imageDataUrl,
        celebrityName: mockResult.celebrityName,
      };
      onNewHistoryItem(newHistoryEntry);

    } catch (apiError: any) {
      console.error("API 통신 중 에러 발생:", apiError);
      setError(apiError.message || "결과를 가져오는 데 실패했어요. 다시 시도해주세요. 😭");
      setCapturedImageForPopup(null);
      setApiResultForPopup(null);
    } finally {
      setIsLoading(false);
    }
  }, [isCameraReady, isModelsLoading, onNewHistoryItem]); // isModelsLoading 의존성 추가

  const handleClosePopup = () => {
    setShowPopup(false);
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  // 오류 메시지가 있다면 화면에 보여줍니다.
  if (error && !isLoading) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  // 모델 로딩 중일 때 표시
  if (isModelsLoading) {
    return (
      <div className={styles.cameraContainer}>
        <LoadingSpinner/>
      </div>
    );
  }

  return (
    <div className={styles.cameraContainer}>
      {/* 로딩 스피너 (API 통신 중) */}
      {isLoading && <LoadingSpinner />}

      {/* 비디오 화면과 오버레이 캔버스 */}
      <video
        ref={videoRef}
        className={styles.videoFeed}
        playsInline
        muted
        // isCameraReady && !isLoading 일 때만 보이도록
        style={{ display: isCameraReady && !isLoading ? 'block' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        className={styles.overlayCanvas} // CSS로 비디오 위에 오버레이
        // 비디오와 동일하게 isCameraReady && !isLoading 일 때만 보이도록
        style={{ display: isCameraReady && !isLoading ? 'block' : 'none' }}
      />

      {/* 카메라가 준비 안됐는데 로딩중도 아닐 때, 안내 메시지 */}
      {!isCameraReady && !isLoading && !error && (
        <div className={styles.preparationMessage}>카메라를 준비하고 있어요... 잠시만요!</div>
      )}

      {/* 사진 찍기 버튼 */}
      {!isLoading && isCameraReady && (
        <button
          onClick={handleTakePhoto}
          className={styles.shutterButton}
          aria-label="사진 찍기"
          disabled={isLoading}
        >
        </button>
      )}

      {/* 결과 팝업 */}
      {showPopup && capturedImageForPopup && apiResultForPopup && (
        <ResultPopup
          capturedImage={capturedImageForPopup}
          resultText={apiResultForPopup.celebrityName}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default CameraView;