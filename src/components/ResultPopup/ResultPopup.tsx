'usse client'; // X 버튼 클릭 이벤트 처리를 위해 필요해요.

import styles from './ResultPopup.module.css';
import Image from 'next/image'; // Next.js 이미지 최적화 컴포넌트 사용

interface ResultPopupProps {
  capturedImage: string; // 사용자가 찍은 사진 (Data URL 형태)
  resultText: string;    // API 결과로 받은 텍스트 (예: 연예인 이름)
  onClose: () => void;   // 팝업을 닫는 함수
}

const ResultPopup: React.FC<ResultPopupProps> = ({ capturedImage, resultText, onClose }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <button onClick={onClose} className={styles.closeButton} aria-label="팝업 닫기">
          {/* SVG 아이콘을 직접 넣거나, public 폴더에 아이콘 파일을 두고 Image 컴포넌트로 불러올 수 있어요.
            여기서는 간단하게 텍스트 'X'로 대체합니다. 추후 SVG로 교체하면 더 예뻐요!
            예: <Image src="/icons/close-icon.svg" alt="닫기" width={20} height={20} />
          */}
          X
        </button>
        <h3 className={styles.title}>결과 확인</h3>
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            <p className={styles.imageLabel}>내가 찍은 사진</p>
            {/* 사용자가 찍은 이미지를 보여줍니다. Next.js의 Image 컴포넌트를 사용했어요.
              외부 URL이 아니므로 loader prop은 필요 없을 수 있지만,
              Data URL의 경우 width와 height를 명시해주는 것이 좋습니다.
            */}
            <Image src={capturedImage} alt="Captured" width={200} height={150} className={styles.resultImage} />
          </div>
          <div className={styles.textResultContainer}>
            <p className={styles.resultLabel}>분석 결과</p>
            <p className={styles.resultTextHighlight}>✨ {resultText} ✨</p>
            <p className={styles.subText}>당신은 {resultText}와(과) 닮았네요!</p>
          </div>
        </div>
        <button onClick={onClose} className={styles.confirmButton}>확인</button>
      </div>
    </div>
  );
};

export default ResultPopup;