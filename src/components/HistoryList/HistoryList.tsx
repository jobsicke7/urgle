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
          const isErrorResult = (alike: string) => {
            const errorStates = [
              'BAD_PIC',
              'NO_FACE_HERE',
              'CANT_PICK_FACE',
              'FACE_TOO_SMALL_OR_WEIRD',
              'EMPTY_CROP',
              'PROCESSING_FAIL',
              'NO_MATCH_FOUND'
            ];
            return errorStates.includes(alike);
          };

          // 2. 최신 항목(isLatest = true)의 결과 이미지 부분 수정:
          <div className={styles.latestImageContainer}>
            {isErrorResult(item.alike) ? (
              <Image
                src="/img/noface.svg"
                alt="얼굴 인식 실패"
                layout="fill"
                objectFit="contain"
                className={`${styles.historyImage} ${styles.latest}`}
              />
            ) : (
              <Image
                src={item.resultImgUrl}
                alt={item.alike}
                layout="fill"
                objectFit="cover"
                className={`${styles.historyImage} ${styles.latest}`}
                unoptimized={item.resultImgUrl.startsWith('http') ? false : true}
              />
            )}
          </div>
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
                        width={1200}
                        height={1200}
                        className={styles.historyImage}
                      />
                    </div>
                  )}
                  <span className={styles.arrow}>&rarr;</span>
                  <div className={styles.imageWrapper}>
                    {isErrorResult(item.alike) ? (
                      <Image
                        src="/img/noface.svg"
                        alt="얼굴 인식 실패"
                        width={1200}
                        height={1200}
                        className={styles.historyImage}
                        style={{ objectFit: 'contain' }}
                      />
                    ) : (
                      <Image
                        src={item.resultImgUrl}
                        alt={item.alike}
                        width={1200}
                        height={1200}
                        className={styles.historyImage}
                        unoptimized={item.resultImgUrl.startsWith('http') ? false : true}
                      />
                    )}
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