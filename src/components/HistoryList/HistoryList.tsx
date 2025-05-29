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
        <p className={styles.emptyMessage}></p>
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.title}>History</h2>
      <ul className={styles.list}>
        {items.map((item, index) => {
          const isLatest = index === 0;

          if (isLatest) {
            return (
              <li key={item.id} className={`${styles.listItem} ${styles.latest}`} style={{ position: 'relative' }}>
                <div className={styles.latestImageRow}>
                  {item.imgUrl && (
                    <div className={styles.latestImageContainer}>
                      <Image
                        src={item.imgUrl}
                        alt="촬영 사진"
                        layout="fill"
                        objectFit="cover"
                        className={`${styles.historyImage} ${styles.latest}`}
                      />
                    </div>
                  )}
                  <span className={`${styles.arrow} ${styles.latest}`}>&rarr;</span>
                  <div className={styles.latestImageContainer}>
                    <Image
                      src={item.resultImgUrl}
                      alt={item.alike}
                      layout="fill"
                      objectFit="cover"
                      className={`${styles.historyImage} ${styles.latest}`}
                      unoptimized={item.resultImgUrl.startsWith('http') ? false : true}
                    />
                  </div>
                </div>
                <div className={`${styles.info} ${styles.latestInfo}`}>
                  <span className={`${styles.celebrityName} ${styles.latest}`}>{item.alike}</span>
                  <span className={`${styles.percentage} ${styles.latest}`}>{item.percentage?.toFixed(1)}%</span>
                  <span className={`${styles.date} ${styles.latest}`}>{new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                </div>
              </li>
            );
          } else {
            return (
              <li key={item.id} className={styles.listItem} style={{ position: 'relative' }}>
                <div className={styles.imageRow}>
                  {item.imgUrl && (
                    <div className={styles.imageWrapper}>
                      <Image
                        src={item.imgUrl}
                        alt="원본"
                        width={60}
                        height={60}
                        className={styles.historyImage}
                      />
                    </div>
                  )}
                  <span className={styles.arrow}>&rarr;</span>
                  <div className={styles.imageWrapper}>
                    <Image
                      src={item.resultImgUrl}
                      alt={item.alike}
                      width={60}
                      height={60}
                      className={styles.historyImage}
                      unoptimized={item.resultImgUrl.startsWith('http') ? false : true}
                    />
                  </div>
                </div>
                <div className={styles.info}>
                  <span className={styles.celebrityName}>{item.alike}</span>
                  <span className={styles.percentage}>{item.percentage?.toFixed(1)}%</span>
                  <span className={styles.date}>{new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};

export default HistoryList;