import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { marketingSite } from '@/lib/marketing/site';

export const metadata: Metadata = {
  title: { absolute: marketingSite.name },
  description: marketingSite.description,
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: marketingSite.name,
    title: marketingSite.name,
    description: marketingSite.description,
    images: [{ url: '/brand/gap-social-logo.png', width: 1200, height: 1200, alt: marketingSite.name }],
  },
  twitter: {
    card: 'summary',
    title: marketingSite.name,
    description: marketingSite.description,
    images: [{ url: '/brand/gap-social-logo.png', alt: marketingSite.name }],
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
