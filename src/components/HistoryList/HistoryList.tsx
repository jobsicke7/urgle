// components/HistoryList/HistoryList.tsx
import styles from './HistoryList.module.css';
import { HistoryItem } from '@/types';
import Image from 'next/image';

interface HistoryListProps {
  items: HistoryItem[];
}

const HistoryList: React.FC<HistoryListProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className={styles.historyContainer}>
        <h2 className={styles.title}>History</h2>
        <p className={styles.emptyMessage}>아직 기록이 없어요. 사진을 찍어 첫 기록을 만들어보세요!</p>
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.title}>History</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.listItem}>
            {item.userCapturedImageUrl && (
              <div className={styles.imageWrapper}>
                <Image
                  src={item.userCapturedImageUrl}
                  alt="사용자 촬영 사진"
                  width={60}
                  height={60}
                  className={styles.historyImage}
                />
                <span className={styles.imageLabel}>촬영</span>
              </div>
            )}
            {item.userCapturedImageUrl && <span className={styles.arrow}>&rarr;</span>}
            <div className={styles.imageWrapper}>
              <Image
                src={item.resultImgUrl}
                alt={item.alike}
                width={60}
                height={60}
                className={styles.historyImage}
                unoptimized={item.resultImgUrl.startsWith('http') ? false : true}
              />
               <span className={styles.imageLabel}>결과</span>
            </div>
            <div className={styles.info}>
              <span className={styles.celebrityName}>{item.alike}</span>
              <span className={styles.percentage}>{item.percentage?.toFixed(1)}%</span>
              <span className={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryList;