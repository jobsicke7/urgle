import styles from './HistoryList.module.css';
import { HistoryItem } from '@/types'; // 타입 정의를 가져옵니다.

interface HistoryListProps {
  items: HistoryItem[]; // 히스토리 아이템 배열을 props로 받습니다.
}

// 실제 이미지 대신 임시로 보여줄 플레이스홀더 컴포넌트
const ImagePlaceholder = ({ text }: { text: string }) => (
  <div className={styles.imagePlaceholder}>
    <span>{text}</span>
  </div>
);

const HistoryList: React.FC<HistoryListProps> = ({ items }) => {
  // 히스토리 목록이 비어있을 때 사용자에게 안내 메시지를 보여주면 좋겠죠?
  if (items.length === 0) {
    return (
      <div className={styles.historyContainer}>
        <h2 className={styles.title}>History</h2>
        <p className={styles.emptyMessage}>응 없어~</p>
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.title}>History</h2>
      <ul className={styles.list}>
        {/* items 배열을 map으로 돌면서 각 히스토리 아이템을 li 태그로 만들어줍니다.
          key는 각 아이템을 구별하기 위한 고유한 값이어야 해요. 여기서는 item.id를 사용했습니다.
        */}
        {items.map((item) => (
          <li key={item.id} className={styles.listItem}>
            {/* TODO: 실제 이미지를 표시하려면 <Image> 컴포넌트와 item.submittedImageUrl을 사용해야 합니다.
              지금은 UI 구조만 잡기 위해 플레이스홀더를 사용했어요.
            */}
            <ImagePlaceholder text="제출 사진" />
            <span className={styles.arrow}>&rarr;</span>
            <div className={styles.result}>
              {/* TODO: 결과 이미지도 있다면 여기에 표시할 수 있습니다.
                item.resultImageUrl 같은 필드를 활용할 수 있겠죠.
              */}
              <ImagePlaceholder text="결과" />
              <span className={styles.celebrityName}>{item.celebrityName}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryList;