'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CameraView.module.css';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import { HistoryItem, LookAlikeResult, UploadResponse } from '@/types';
import Image from 'next/image';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/constants';

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
 const animationFrameRef = useRef<number | null>(null);
 const frameOrderRef = useRef<number>(0);

 const [isCameraReady, setIsCameraReady] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showPopup, setShowPopup] = useState(false);
 const [capturedImageForPopup, setCapturedImageForPopup] = useState<string | null>(null);
 const [apiResultForPopup, setApiResultForPopup] = useState<LookAlikeResult | null>(null);
 const [moodImageSrc, setMoodImageSrc] = useState<string | null>(null);
 const [isSocketConnected, setIsSocketConnected] = useState(false);

 const cleanupSocket = () => {
   if (socketRef.current) {
     socketRef.current.disconnect();
     socketRef.current = null;
   }
   if (animationFrameRef.current) {
     cancelAnimationFrame(animationFrameRef.current);
   }
   setIsSocketConnected(false);
 };

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
   if (!videoRef.current || !moodCanvasRef.current || !isSocketConnected) {
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
   canvas.toBlob(async (blob) => {
     if (blob && socketRef.current && isSocketConnected) {
       try {
         const currentOrder = frameOrderRef.current++;
         const arrayBuffer = await blob.arrayBuffer();
         const payload = {
           order: `${currentOrder.toString(16).padStart(4, '0')}`,
           data: arrayBuffer,
         };
         
         socketRef.current.timeout(5000).emit('frame', payload, (error: any, processed: any) => {
           if (error) {
             console.warn('Frame emit timeout or error:', error);
             return;
           }
           
           if (processed && processed.data) {
             console.log('Received order:', processed.order);
             console.log('Received data:', processed.data);
             const receivedBlob = new Blob([processed.data], { type: 'image/jpeg' });
             const imageUrl = URL.createObjectURL(receivedBlob);
             console.log(imageUrl);
             setMoodImageSrc(imageUrl);
           }
         });
       } catch (socketError) {
         console.warn('Socket emit error:', socketError);
       }
     }
     animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
   }, 'image/jpeg', 0.7);
 }, [isSocketConnected]);

 useEffect(() => {
   setupCamera();
 
   try {
     socketRef.current = io('/api/mood', {
       transports: ['websocket', 'polling'],
       upgrade: true,
       rememberUpgrade: true,
       timeout: 10000,
       forceNew: true,
     });

     socketRef.current.on('connect', () => {
       console.log('Socket connected');
       setIsSocketConnected(true);
       if (isCameraReady) {
         animationFrameRef.current = requestAnimationFrame(sendFrameForMoodDetection);
       }
     });

     socketRef.current.on('connect_error', (err) => {
       console.warn('Socket connection error:', err);
       setIsSocketConnected(false);
     });

     socketRef.current.on('disconnect', (reason) => {
       console.log('Socket disconnected:', reason);
       setIsSocketConnected(false);
     });

     socketRef.current.on('reconnect', () => {
       console.log('Socket reconnected');
       setIsSocketConnected(true);
     });

     socketRef.current.on('reconnect_error', (err) => {
       console.warn('Socket reconnection error:', err);
       setIsSocketConnected(false);
     });

   } catch (socketInitError) {
     console.warn('Socket initialization error:', socketInitError);
     setIsSocketConnected(false);
   }
 
   return () => {
     if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream;
       stream.getTracks().forEach(track => track.stop());
     }
     cleanupSocket();
   };
 }, [setupCamera, sendFrameForMoodDetection, isCameraReady]);

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
         <Image src={moodImageSrc} alt="Mood analysis" width={160} height={120} className={styles.moodImage} />
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