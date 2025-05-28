'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
  const [apiResultForPopup, setApiResultForPopup] = useState<ApiResult | null>(null);

  // 모델 로드 및 카메라 스트림 설정
  useEffect(() => {
    const loadModels = async () => {
      try {
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

  // 실시간 얼굴 감지 및 감정 분석
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

    let animationFrameId: number;

    const detectFaces = async () => {
      if (video.paused || video.ended || !video.videoWidth || !video.videoHeight) {
        return;
      }

      // 캔버스 크기를 비디오의 실제 크기로 설정
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      
      // 캔버스 크기 업데이트
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;
      
      faceapi.matchDimensions(canvas, displaySize);

      try {
        // 얼굴 감지 및 감정 분석
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceExpressions();

        // 캔버스 초기화
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length > 0) {
          // 감지된 결과를 캔버스 크기에 맞게 조정
          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          // 얼굴 외곽선 그리기 (바운딩 박스)
          faceapi.draw.drawDetections(canvas, resizedDetections);

          // 랜드마크 점들 그리기 (선택사항)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          // 각 얼굴에 대해 감정 표시
          resizedDetections.forEach((detection) => {
            const { x, y } = detection.detection.box;
            const expressions = detection.expressions;
            
            // 가장 높은 확률의 감정 찾기
            const maxExpression = Object.keys(expressions).reduce((a, b) => 
              expressions[a as keyof typeof expressions] > expressions[b as keyof typeof expressions] ? a : b
            );
            const maxValue = expressions[maxExpression as keyof typeof expressions] as number;

            // 텍스트 스타일 설정
            context.fillStyle = '#00ff00';
            context.font = '16px Arial';
            context.strokeStyle = '#000000';
            context.lineWidth = 2;

            // 주요 감정 표시
            const mainText = `${maxExpression}: ${(maxValue * 100).toFixed(1)}%`;
            context.strokeText(mainText, x, y - 10);
            context.fillText(mainText, x, y - 10);

            // 모든 감정 확률 표시 (상위 3개)
            const sortedExpressions = Object.entries(expressions)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3);

            sortedExpressions.forEach(([emotion, probability], index) => {
              const text = `${emotion}: ${(probability * 100).toFixed(1)}%`;
              const yPos = y + detection.detection.box.height + 20 + (index * 20);
              
              context.strokeText(text, x, yPos);
              context.fillText(text, x, yPos);
            });
          });
        }
      } catch (error) {
        console.error('얼굴 감지 중 오류:', error);
      }

      // 다음 프레임 요청
      animationFrameId = requestAnimationFrame(detectFaces);
    };

    // 비디오가 재생 중이면 감지 시작
    const startDetection = () => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        detectFaces();
      }
    };

    // 비디오 준비 상태 확인
    if (video.readyState >= 2) {
      startDetection();
    } else {
      video.addEventListener('loadeddata', startDetection);
    }

    // 정리 함수
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      video.removeEventListener('loadeddata', startDetection);
    };
  }, [isCameraReady, isModelsLoading]);

  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady || isModelsLoading) {
      setError("카메라가 아직 준비되지 않았거나, AI 모델 로딩 중입니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    const context = tempCanvas.getContext('2d');
    if (!context) {
      setError("캔버스 컨텍스트를 가져올 수 없어요.");
      setIsLoading(false);
      return;
    }

    // 비디오 프레임을 임시 캔버스에 그립니다.
    context.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    const imageDataUrl = tempCanvas.toDataURL('image/jpeg');
    setCapturedImageForPopup(imageDataUrl);

    const imageBlob = await new Promise<Blob | null>(resolve => tempCanvas.toBlob(resolve, 'image/jpeg'));

    if (!imageBlob) {
      setError("이미지 데이터를 Blob으로 변환하는 데 실패했어요.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('photo', imageBlob, 'capture.jpg');

    try {
      console.log("서버로 전송될 이미지 데이터 (Blob):", imageBlob);
      console.log("서버로 전송될 FormData:", formData.get('photo'));
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult: ApiResult = {
        celebrityName: "아이유",
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
  }, [isCameraReady, isModelsLoading, onNewHistoryItem]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  if (error && !isLoading) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (isModelsLoading) {
    return (
      <div className={styles.cameraContainer}>
        <LoadingSpinner/>
      </div>
    );
  }

  return (
    <div className={styles.cameraContainer}>
      {isLoading && <LoadingSpinner />}

      <video
        ref={videoRef}
        className={styles.videoFeed}
        playsInline
        muted
        style={{ display: isCameraReady && !isLoading ? 'block' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        className={styles.overlayCanvas}
        style={{ display: isCameraReady && !isLoading ? 'block' : 'none' }}
      />

      {!isCameraReady && !isLoading && !error && (
        <div className={styles.preparationMessage}>카메라를 준비하고 있어요... 잠시만요!</div>
      )}

      {!isLoading && isCameraReady && (
        <button
          onClick={handleTakePhoto}
          className={styles.shutterButton}
          aria-label="사진 찍기"
          disabled={isLoading}
        >
        </button>
      )}

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