'use client';

import s from './LoadingSpinner.module.css';

export default function LoadingSpinner({ label = 'Decrypting classified records...' }) {
  return (
    <div className={s.loaderContainer}>
      <div className={s.radarRing} />
      <span className={s.loaderLabel}>{label}</span>
    </div>
  );
}
