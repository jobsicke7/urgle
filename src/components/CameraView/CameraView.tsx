'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import { HistoryItem, LookAlikeResult, UploadResponse } from '@/types';
import Image from 'next/image';
import io, { Socket } from 'socket.io-client';

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
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const socketRef = useRef<Socket | null>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
  const [apiResultForPopup, setApiResultForPopup] = useState<LookAlikeResult | null>(null);
  const [moodImageSrc, setMoodImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Socket.io 연결 설정
  const setupSocket = useCallback(() => {
    if (socketRef.current) return;

    console.log('🔌 Socket.io 연결 시도...');
    socketRef.current = io('http://kgh1113.ddns.net:80/api/mood', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket.io 연결 성공');
      setIsSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket.io 연결 끊김');
      setIsSocketConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('🔥 Socket.io 연결 오류:', error);
      setIsSocketConnected(false);
    });

    // 감정 분석 결과 수신
    socketRef.current.on('mood_result', (data) => {
      console.log('📨 감정 분석 결과 수신:', data);
      
      if (data.success && data.imageData) {
        // Base64 이미지 데이터를 Blob URL로 변환
        const byteCharacters = atob(data.imageData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);
        
        // 이전 URL 정리
        if (moodImageSrc) {
          URL.revokeObjectURL(moodImageSrc);
        }
        
        setMoodImageSrc(imageUrl);
      }
      
      setIsProcessing(false);
    });

    socketRef.current.on('mood_error', (error) => {
      console.error('❌ 감정 분석 오류:', error);
      setIsProcessing(false);
    });

  }, [moodImageSrc]);

  const setupCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("응 카메라 지원 안해~");
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
    const now = Date.now();
    
    // 1초에 한 번만 전송 (성능 최적화)
    if (now - lastFrameTimeRef.current < 1000) {
      animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
      return;
    }

    if (!videoRef.current || !moodCanvasRef.current || isProcessing || !isSocketConnected || !socketRef.current) {
      animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
      return;
    }

    const video = videoRef.current;
    const canvas = moodCanvasRef.current;
    canvas.width = video.videoWidth / 4;
    canvas.height = video.videoHeight / 4;
    const context = canvas.getContext('2d');
    
    if (!context) {
      animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Canvas를 Base64로 변환하여 Socket으로 전송
    canvas.toBlob(async (blob) => {
      if (blob && !isProcessing && socketRef.current) {
        setIsProcessing(true);
        lastFrameTimeRef.current = now;
        
        try {
          // Blob을 ArrayBuffer로 변환
          const arrayBuffer = await blob.arrayBuffer();
          const base64Data = arrayBufferToBase64(arrayBuffer);
          
          console.log('📤 Socket으로 프레임 전송 (크기:', blob.size, ')');
          
          // Socket.io로 프레임 데이터 전송
          socketRef.current.emit('mood_frame', {
            imageData: base64Data,
            timestamp: now,
          });
          
        } catch (error) {
          console.error('❌ 프레임 전송 오류:', error);
          setIsProcessing(false);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
    }, 'image/jpeg', 0.7);
  }, [isProcessing, isSocketConnected]);

  useEffect(() => {
    setupSocket();
    setupCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // URL 정리
      if (moodImageSrc) {
        URL.revokeObjectURL(moodImageSrc);
      }
    };
  }, [setupCamera, setupSocket]);

  useEffect(() => {
    if (isCameraReady && isSocketConnected) {
      animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
    }
  }, [isCameraReady, isSocketConnected, sendFrameForMoodDetection]);

  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError("카메라 로딩 실패");
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
      setError("가져오기 실패");
      setIsLoading(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImageForPopup(imageDataUrl);

    const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    if (!imageBlob) {
      setError("이미지 변환 실패");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'capture.jpg');

      const uploadRes = await fetch('/api/look-alike/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error(`이미지 업로드 실패: ${uploadRes.statusText}`);
      const uploadResult: UploadResponse = await uploadRes.json();

      const lookAlikeRes = await fetch('/api/look-alike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imgUrl: uploadResult.url }),
      });
      if (!lookAlikeRes.ok) throw new Error(`분석 실패: ${lookAlikeRes.statusText}`);
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
      setError(apiError.message || "오류 발생");
    } finally {
      setIsLoading(false);
    }
  }, [isCameraReady, onNewHistoryItem]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  return (
    <div className={styles.cameraContainer}>
      {isLoading && <LoadingSpinner />}
      
      {/* Socket 연결 상태 표시 */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        fontSize: '12px',
        color: isSocketConnected ? 'green' : 'red',
        zIndex: 10 
      }}>
        Socket: {isSocketConnected ? '연결됨' : '연결 안됨'}
      </div>
      
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
        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}
      </div>

      {moodImageSrc && (
        <div className={styles.moodDisplay}>
          <p>실시간 감정 분석 (Socket.io)</p>
          <Image 
            src={moodImageSrc} 
            alt="Mood analysis" 
            width={160} 
            height={120} 
            className={styles.moodImage} 
          />
          {isProcessing && <p style={{fontSize: '0.7em', color: '#666'}}>처리중...</p>}
        </div>
      )}

      {!isLoading && isCameraReady && (
        <button
          onClick={handleTakePhoto}
          className={styles.shutterButton}
          aria-label="촬영"
          disabled={isLoading}
        />
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <canvas ref={moodCanvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default CameraView;