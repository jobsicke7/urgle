// components/LoadingSpinner/LoadingSpinner.tsx
import styles from './LoadingSpinner.module.css';

const LoadingSpinner = () => {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>당신과 닮은 연예인은?</p>
    </div>
  );
};

export default LoadingSpinner;