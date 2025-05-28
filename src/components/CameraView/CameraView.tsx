'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import ResultPopup from '../ResultPopup/ResultPopup';
import { HistoryItem, ApiResult } from '@/types';

interface CameraViewProps {
  onNewHistoryItem: (item: HistoryItem) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onNewHistoryItem }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
  const [apiResultForPopup, setApiResultForPopup] = useState<ApiResult | null>(null);

  useEffect(() => {
    const setupCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("카메라를 사용할 수 없습니다.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        setError("카메라 접근 권한이 필요합니다.");
      }
    };

    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    };

    setupCamera();
    loadModels();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || !overlayCanvasRef.current || !isCameraReady) return;

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      const canvas = overlayCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      context.clearRect(0, 0, canvas.width, canvas.height);

      const resized = faceapi.resizeResults(detections, {
        width: canvas.width,
        height: canvas.height,
      });

      resized.forEach(det => {
        const { x, y, width, height } = det.detection.box;
        context.strokeStyle = 'red';
        context.lineWidth = 2;
        context.strokeRect(x, y, width, height);

        const emotions = Object.entries(det.expressions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);

        context.fillStyle = 'red';
        context.font = '14px Arial';
        emotions.forEach(([emo, score], i) => {
          context.fillText(`${emo}: ${(score * 100).toFixed(1)}%`, x, y - 10 - i * 16);
        });
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isCameraReady]);

  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !captureCanvasRef.current) return;
    setIsLoading(true);

    const canvas = captureCanvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImageForPopup(imageDataUrl);

    const imageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    if (!imageBlob) return;

    await new Promise(res => setTimeout(res, 1500));
    const mockResult: ApiResult = { celebrityName: '아이유' };
    setApiResultForPopup(mockResult);
    setShowPopup(true);
    onNewHistoryItem({ id: Date.now().toString(), submittedImageUrl: imageDataUrl, celebrityName: mockResult.celebrityName });
    setIsLoading(false);
  }, [onNewHistoryItem]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setCapturedImageForPopup(null);
    setApiResultForPopup(null);
  };

  if (error && !isLoading) return <div className={styles.errorMessage}>{error}</div>;

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
      <canvas ref={overlayCanvasRef} className={styles.overlayCanvas} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {!isLoading && isCameraReady && (
        <button onClick={handleTakePhoto} className={styles.shutterButton} aria-label="사진 찍기" />
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