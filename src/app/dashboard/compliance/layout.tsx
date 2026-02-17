import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compliance',
  description: 'Audited access to chat messages under your compliance policy',
};

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
