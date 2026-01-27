import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Active Sessions',
  description: 'Monitor and manage online user sessions',
};

export default function ActiveSessionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
