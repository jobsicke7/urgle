'use client'; // useState와 같은 클라이언트 사이드 훅을 사용하기 때문에 명시합니다.

import { useState } from 'react';
import styles from './page.module.css'; // 페이지 전용 CSS 모듈
import HistoryList from '@/components/HistoryList/HistoryList';
import CameraView from '@/components/CameraView/CameraView';
import { HistoryItem } from '@/types'; // 히스토리 아이템 타입

export default function HomePage() {
  // 히스토리 목록 상태를 여기서 관리합니다. CameraView에서 새 항목이 생기면 이 상태가 업데이트돼요.
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
    // 초기 히스토리 데이터 예시 (UI 확인용)
    // 나중에는 이부분을 비우거나, 로컬 스토리지, 또는 서버에서 불러올 수 있겠죠?
    return [
      // { id: '1', submittedImageUrl: 'placeholder1', celebrityName: '원빈' },
      // { id: '2', submittedImageUrl: 'placeholder2', celebrityName: '장동건' },
    ];
  });

  // CameraView 컴포넌트에서 새로운 히스토리 아이템이 생성되었을 때 호출될 함수입니다.
  // 이 함수는 새 아이템을 기존 목록의 맨 앞에 추가해요. (최신순 정렬)
  const handleAddNewHistoryItem = (newItem: HistoryItem) => {
    setHistoryItems(prevItems => [newItem, ...prevItems]);
    // 필요하다면 여기서 히스토리 목록을 로컬 스토리지에 저장하거나,
    // 서버로 보내는 등의 추가 작업을 할 수 있어요.
    // console.log("새로운 히스토리 아이템:", newItem);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>UR·GLE</h1>
        {/* 여기에 네비게이션이나 다른 헤더 요소들을 추가할 수 있겠죠? */}
      </header>

      <main className={styles.mainContent}>
        {/* 왼쪽에는 히스토리 목록을 보여주는 HistoryList 컴포넌트를配置します。
          historyItems 상태를 props로 전달해서 목록을 그리도록 해요.
        */}
        <aside className={styles.historyPanel}>
          <HistoryList items={historyItems} />
        </aside>

        {/* 오른쪽에는 카메라 화면과 관련 기능을 담당하는 CameraView 컴포넌트를配置します。
          onNewHistoryItem 콜백 함수를 props로 전달해서, 사진 촬영 및 분석 후
          새로운 히스토리 아이템을 page.tsx의 상태로 올릴 수 있게 연결해줍니다.
        */}
        <section className={styles.cameraPanel}>
          <CameraView onNewHistoryItem={handleAddNewHistoryItem} />
        </section>
      </main>

      {/* <footer className={styles.footer}>
          <p>&copy; 2024 UR·GLE. All rights reserved.</p>
        </footer> 
      */}
    </div>
  );
}