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
  const frameCounterRef = useRef<number>(0);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFrameLoopRunningRef = useRef<boolean>(false);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
  const [apiResultForPopup, setApiResultForPopup] = useState<LookAlikeResult | null>(null);
  const [socketImageSrc, setSocketImageSrc] = useState<string | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const clearProcessingTimeout = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  const setupSocket = useCallback(() => {
    if (socketRef.current) return;

    socketRef.current = io('https://www.jobsickes.shop/api/mood', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('연결 성공');
      setIsSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('연결 끊김');
      setIsSocketConnected(false);
      setSocketImageSrc(null);
      clearProcessingTimeout();
      setIsProcessingFrame(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error(err);
      setIsSocketConnected(false);
      setError('서버에 연결할 수 없음');
      clearProcessingTimeout();
      setIsProcessingFrame(false);
    });

    socketRef.current.on('mood_error', (err) => {
      clearProcessingTimeout();
      setIsProcessingFrame(false);
    });
  }, [clearProcessingTimeout]);

  const setupCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("브라우저가 카메라를 지원하지 않음");
      setIsCameraReady(false);
      return;
    }
    try {
      const constraints = {
        video: {
          width: { ideal: 4096, max: 4096 },
          height: { ideal: 2160, max: 2160 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
          aspectRatio: { ideal: 16/9 }
        }
      };

      let stream: MediaStream;
    
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 3840, max: 3840 },
            height: { ideal: 2160, max: 2160 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          }
        });
      } catch (fourKError) {
        console.warn(":", fourKError);
        
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              facingMode: 'user',
              frameRate: { ideal: 30 }
            }
          });
        } catch (hdError) {
          console.warn(":", hdError);
          
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
              facingMode: 'user'
            }
          });
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          const video = videoRef.current!;
          console.log(`${video.videoWidth}x${video.videoHeight}`);
          
          videoRef.current?.play().catch(err_play => {
            console.error("카메라 로딩 실패:", err_play);
            setError("카메라를 로딩할 수 없습니다.");
          });
        };
        
        videoRef.current.oncanplay = () => {
          setIsCameraReady(true);
          setError(null);
        }
      }
    } catch (err_camera) {
      console.error("카메라 접근 실패: ", err_camera);
      if ((err_camera as Error).name === "NotAllowedError" || (err_camera as Error).name === "PermissionDeniedError") {
        setError("카메라 권한 거부");
      } else {
        setError("카메라 복수 사용");
      }
      setIsCameraReady(false);
    }
  }, []);

  const startFrameLoop = useCallback(() => {
    if (isFrameLoopRunningRef.current) return;
    isFrameLoopRunningRef.current = true;
    
    const frameLoop = () => {
      if (!isFrameLoopRunningRef.current) return;
      
      const now = Date.now();
      const frameInterval = 1000 / 10;

      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !moodCanvasRef.current || !isSocketConnected || !socketRef.current?.connected) {
        animationFrameRef.current = requestAnimationFrame(frameLoop);
        return;
      }

      if (now - lastFrameTimeRef.current < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(frameLoop);
        return;
      }
      lastFrameTimeRef.current = now;

      const video = videoRef.current;
      const canvas = moodCanvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(frameLoop);
        return;
      }

      canvas.width = video.videoWidth / 2;
      canvas.height = video.videoHeight / 2;
      const context = canvas.getContext('2d');

      if (!context) {
        animationFrameRef.current = requestAnimationFrame(frameLoop);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (blob && !isProcessingFrame && socketRef.current?.connected) {
          setIsProcessingFrame(true);
          clearProcessingTimeout();
          processingTimeoutRef.current = setTimeout(() => {
            if (isProcessingFrame) {
              setIsProcessingFrame(false);
            }
          }, 3000);

          try {
            const arrayBuffer = await blob.arrayBuffer();
            frameCounterRef.current += 1;
            const orderHex = frameCounterRef.current.toString(16);

            socketRef.current.emit(
              'frame',
              {
                order: orderHex,
                data: arrayBuffer,
              },
              (responseData: { order: string, data: ArrayBuffer | null }) => {
                clearProcessingTimeout();
                if (responseData.data && responseData.data instanceof ArrayBuffer) {
                  try {
                    const base64Image = arrayBufferToBase64(responseData.data);
                    const imageUrl = `data:image/jpeg;base64,${base64Image}`;
                    setSocketImageSrc(imageUrl);
                  } catch (e) {
                    console.error(e);
                  }
                } else {
                  if (responseData.order === '0' && responseData.data === null) {
                    console.warn(responseData);
                  } else if (responseData.data !== null && !((responseData.data as any) instanceof ArrayBuffer)) {
                    console.error(responseData.data);
                  } else {
                    console.warn(responseData);
                  }
                }
                setIsProcessingFrame(false);
              }
            );
          } catch (error_emit) {
            clearProcessingTimeout();
            setIsProcessingFrame(false);
          }
        }
      }, 'image/jpeg', 0.5);

      if (isFrameLoopRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(frameLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(frameLoop);
  }, [isProcessingFrame, isSocketConnected, clearProcessingTimeout]);

  const stopFrameLoop = useCallback(() => {
    isFrameLoopRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    setupSocket();
    setupCamera();

    return () => {
      stopFrameLoop();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      clearProcessingTimeout();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [setupCamera, setupSocket, clearProcessingTimeout, stopFrameLoop]);

  useEffect(() => {
    if (isCameraReady && isSocketConnected && videoRef.current?.readyState && videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
      startFrameLoop();
    } else {
      stopFrameLoop();
    }

    return () => {
      stopFrameLoop();
    };
  }, [isCameraReady, isSocketConnected, startFrameLoop, stopFrameLoop]);

  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError("카메라가 준비되지 않았거나 로딩에 실패했습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("카메라 오류");
      setIsLoading(false);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setError("이미지 가져오기 오류");
      setIsLoading(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImageForPopup(imageDataUrl);

    const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!imageBlob) {
      setError("변환 오류");
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
      if (!uploadRes.ok) throw new Error(`이미지 업로드 실패: ${uploadRes.statusText} (${uploadRes.status})`);
      const uploadResult: UploadResponse = await uploadRes.json();

      const lookAlikeRes = await fetch('/api/look-alike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imgUrl: uploadResult.url }),
      });
      if (!lookAlikeRes.ok) throw new Error(`실패: ${lookAlikeRes.statusText} (${lookAlikeRes.status})`);
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
      setError(apiError.message);
    } finally {
      setIsLoading(false);
      // 업로드 완료 후 프레임 루프가 계속 실행되도록 보장
      if (isCameraReady && isSocketConnected && !isFrameLoopRunningRef.current) {
        startFrameLoop();
      }
    }
  }, [isCameraReady, onNewHistoryItem, isSocketConnected, startFrameLoop]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  return (
    <div className={styles.cameraContainer}>
      {isLoading && <LoadingSpinner />}

      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ display: 'none' }}
        />

        {error && !isLoading && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        {!error && !isLoading && (
          <>
            {isSocketConnected && socketImageSrc ? (
              <div className={styles.processedImageContainer}>
                <Image
                  src={socketImageSrc}
                  alt="img"
                  layout="fill"
                  objectFit="contain"
                  className={styles.processedImage}
                  priority
                />
              </div>
            ) : !isCameraReady && !isSocketConnected ? (
              <div className={styles.preparationMessage}>연결 중</div>
            ) : !isCameraReady && isSocketConnected ? (
              <div className={styles.preparationMessage}>카메라 대기중</div>
            ) : isCameraReady && !isSocketConnected ? (
              <div className={styles.preparationMessage}>응답 대기중</div>
            ) : (
              <div className={styles.preparationMessage}>대기중</div>
            )}
          </>
        )}
      </div>

      {!isLoading && isCameraReady && (
        <button
          onClick={handleTakePhoto}
          className={styles.shutterButton}
          aria-label="사진 촬영"
          disabled={isLoading || !isCameraReady}
        />
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <canvas ref={moodCanvasRef} style={{ display: 'none' }}></canvas>

    </div>
  );
};

export default CameraView;