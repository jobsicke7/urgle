// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import HistoryList from '@/components/HistoryList/HistoryList';
import CameraView from '@/components/CameraView/CameraView';
import { HistoryItem } from '@/types';
import { API_BASE_URL } from '@/lib/constants';

export default function HomePage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [errorPage, setErrorPage] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/look-alike`);
      if (!response.ok) {
        throw new Error(`기록을 불러오는데 실패했습니다: ${response.statusText}`);
      }
      const data: HistoryItem[] = await response.json();
      setHistoryItems(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
      setErrorPage(err.message || "기록을 불러올 수 없습니다.");
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddNewHistoryItem = useCallback((newItem: HistoryItem) => {
    setHistoryItems(prevItems => [newItem, ...prevItems]
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>UR·GLE</h1>
      </header>

      <main className={styles.mainContent}>
        {errorPage && <p className={styles.pageError}>{errorPage}</p>}
        <aside className={styles.historyPanel}>
          <HistoryList items={historyItems} />
        </aside>
        <section className={styles.cameraPanel}>
          <CameraView onNewHistoryItem={handleAddNewHistoryItem} />
        </section>
      </main>
    </div>
  );
}