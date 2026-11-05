import Image from 'next/image';
import type { ReactNode } from 'react';
import { marketingSite } from '@/lib/marketing/site';
import styles from './marketing.module.css';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <Image
          src="/brand/180dc-uc-davis-landscape-dark.png"
          alt={marketingSite.name}
          width={928}
          height={318}
          sizes="(max-width: 480px) 160px, 208px"
          loading="eager"
          className={styles.logo}
        />
        <nav aria-label="Public website">
          {/* No portal prefetch: opening this public page must not perform GAP session work. */}
          <a href={marketingSite.gapHref} className={styles.portalLink}>
            Open GAP <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
      <footer className={styles.footer}>180 Degrees Consulting · UC Davis</footer>
    </div>
  );
}
