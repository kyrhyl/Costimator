import { ReactNode } from 'react';
import styles from './A4PageWrapper.module.css';

interface A4PageWrapperProps {
  pageNumber: number;
  children: ReactNode;
}

export function A4PageWrapper({ pageNumber, children }: A4PageWrapperProps) {
  return (
    <div 
      className={`a4-page ${styles['a4-page']}`}
      data-page={pageNumber}
    >
      {children}
    </div>
  );
}
