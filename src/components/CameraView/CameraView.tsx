// components/CameraView/CameraView.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import ResultPopup from '../ResultPopup/ResultPopup';
import { HistoryItem, LookAlikeResult, UploadResponse, MoodFrameToServer, MoodFrameFromServer } from '@/types';
import Image from 'next/image';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/constants';

const FRAME_INTERVAL = 1000;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

interface CameraViewProps {
  onNewHistoryItem: (item: HistoryItem) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onNewHistoryItem }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moodCanvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameOrderRef = useRef(0);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
  const [apiResultForPopup, setApiResultForPopup] = useState<LookAlikeResult | null>(null);
  const [moodImageSrc, setMoodImageSrc] = useState<string | null>(null);

  const cleanupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (frameTimeoutRef.current) {
      clearTimeout(frameTimeoutRef.current);
    }
  };

  const setupCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("웅 커매러 지원 안해~");
      setIsCameraReady(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Camera access failed: ", err);
      setError("카메라 접근 권한 없어~");
      setIsCameraReady(false);
    }
  }, []);

  const sendFrameForMoodDetection = useCallback(() => {
    if (!videoRef.current || !moodCanvasRef.current || !socketRef.current || !socketRef.current.connected) {
      if (frameTimeoutRef.current) clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = setTimeout(sendFrameForMoodDetection, FRAME_INTERVAL);
      return;
    }

    const video = videoRef.current;
    const canvas = moodCanvasRef.current;
    canvas.width = video.videoWidth / 4;
    canvas.height = video.videoHeight / 4;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob && socketRef.current && socketRef.current.connected) {
        const arrayBuffer = await blob.arrayBuffer();
        const payload: MoodFrameToServer = {
          order: `frameOrderRef.current++.toString(16)`,
          data: arrayBuffer,
        };
        socketRef.current.emit('frame', payload);
      }
      if (frameTimeoutRef.current) clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = setTimeout(sendFrameForMoodDetection, FRAME_INTERVAL);
    }, 'image/jpeg', 0.7);
  }, []);

  useEffect(() => {
    setupCamera();

    const socketUrl = 'http://kgh1113.ddns.net';

    socketRef.current = io("http://kgh1113.ddns.net:80/api/mood");

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      if (isCameraReady) {
        if (frameTimeoutRef.current) clearTimeout(frameTimeoutRef.current);
        frameTimeoutRef.current = setTimeout(sendFrameForMoodDetection, FRAME_INTERVAL);
      }
    });

    socketRef.current.on('frame', (data: MoodFrameFromServer) => {
      const imageBase64 = arrayBufferToBase64(data.data);
      setMoodImageSrc(`data:image/jpeg;base64,${imageBase64}`);
    });

    socketRef.current.on('disconnect', () => { });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError("서버 연결 실패");
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cleanupSocket();
    };
  }, [setupCamera, sendFrameForMoodDetection, isCameraReady]);

  useEffect(() => {
    if (isCameraReady && socketRef.current?.connected) {
      if (frameTimeoutRef.current) clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = setTimeout(sendFrameForMoodDetection, FRAME_INTERVAL);
    }
  }, [isCameraReady, sendFrameForMoodDetection]);

  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError("카메라가 준비되지 않았습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError("캔버스 컨텍스트를 가져올 수 없습니다.");
      setIsLoading(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImageForPopup(imageDataUrl);

    const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    if (!imageBlob) {
      setError("이미지 변환에 실패했습니다.");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'capture.jpg');

      const uploadRes = await fetch(`${API_BASE_URL}/api/look-alike/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error(`이미지 업로드 실패: ${uploadRes.statusText}`);
      const uploadResult: UploadResponse = await uploadRes.json();

      const lookAlikeRes = await fetch(`${API_BASE_URL}/api/look-alike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imgUrl: uploadResult.url }),
      });
      if (!lookAlikeRes.ok) throw new Error(`닮은꼴 분석 실패: ${lookAlikeRes.statusText}`);
      const resultData: LookAlikeResult = await lookAlikeRes.json();

      setApiResultForPopup(resultData);
      setShowPopup(true);

      const newHistoryEntry: HistoryItem = {
        id: new Date().toISOString() + Math.random(),
        alike: resultData.alike,
        percentage: resultData.percentage,
        resultImgUrl: resultData.resultImgUrl,
        imgUrl: uploadResult.url,
        createdAt: new Date().toISOString(),
        userCapturedImageUrl: imageDataUrl,
      };
      onNewHistoryItem(newHistoryEntry);

    } catch (apiError: any) {
      console.error("API Error:", apiError);
      setError(apiError.message || "결과 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isCameraReady, onNewHistoryItem]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  if (error && !isLoading) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <div className={styles.cameraContainer}>
      {isLoading && <LoadingSpinner />}
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          className={styles.videoFeed}
          playsInline
          muted
          style={{ display: isCameraReady && !isLoading ? 'block' : 'none' }}
        />
        {!isCameraReady && !isLoading && !error && (
          <div className={styles.preparationMessage}>카메라 준비 중...</div>
        )}
      </div>

      {moodImageSrc && (
        <div className={styles.moodDisplay}>
          <p>실시간 감정 분석:</p>
          <Image src={moodImageSrc} alt="Mood analysis" width={160} height={120} className={styles.moodImage} />
        </div>
      )}

      {!isLoading && isCameraReady && (
        <button
          onClick={handleTakePhoto}
          className={styles.shutterButton}
          aria-label="사진 찍기"
          disabled={isLoading}
        />
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <canvas ref={moodCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default CameraView;