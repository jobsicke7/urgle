// components/ResultPopup/ResultPopup.tsx
'use client';

import styles from './ResultPopup.module.css';
import Image from 'next/image';
import { LookAlikeResult } from '@/types';

interface ResultPopupProps {
  capturedImage: string;
  result: LookAlikeResult;
  onClose: () => void;
}

const ResultPopup: React.FC<ResultPopupProps> = ({ capturedImage, result, onClose }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <button onClick={onClose} className={styles.closeButton} aria-label="팝업 닫기">
          X
        </button>
        <h3 className={styles.title}>결과 확인</h3>
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            <p className={styles.imageLabel}>내가 찍은 사진</p>
            <Image src={capturedImage} alt="Captured" width={200} height={150} className={styles.resultImage} />
          </div>
          <div className={styles.textResultContainer}>
            <p className={styles.resultLabel}>분석 결과</p>
            <Image
              src={result.resultImgUrl}
              alt={result.alike}
              width={100}
              height={100}
              className={styles.celebrityImage}
              unoptimized={result.resultImgUrl.startsWith('http') ? false : true}
            />
            <p className={styles.resultTextHighlight}>{result.alike}</p>
            <p className={styles.percentage}>닮은 확률: {result.percentage?.toFixed(1)}%</p>
            <p className={styles.subText}>당신은 {result.alike}와(과) 닮았네요!</p>
          </div>
        </div>
        <button onClick={onClose} className={styles.confirmButton}>확인</button>
      </div>
    </div>
  );
};

export default ResultPopup;