import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your organization',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
