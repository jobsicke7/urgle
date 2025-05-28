'use client';

import styles from './ResultPopup.module.css';
import Image from 'next/image';

interface ResultPopupProps {
  capturedImage: string;
  resultText: string;
  onClose: () => void;
}

const ResultPopup: React.FC<ResultPopupProps> = ({ capturedImage, resultText, onClose }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <button onClick={onClose} className={styles.closeButton} aria-label="닫기">
          ×
        </button>
        <h3 className={styles.title}>결과 확인</h3>
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            <p className={styles.imageLabel}>촬영 이미지</p>
            <Image
              src={capturedImage}
              alt="촬영 이미지"
              width={400}
              height={300}
              className={styles.resultImage}
            />
          </div>
          <div className={styles.textResultContainer}>
            <p className={styles.resultLabel}>AI 분석 결과</p>
            <p className={styles.resultTextHighlight}>{resultText}</p>
            <p className={styles.subText}>당신은 {resultText}와(과) 닮았어요.</p>
          </div>
        </div>
        <button onClick={onClose} className={styles.confirmButton}>확인</button>
      </div>
    </div>
  );
};

export default ResultPopup;
