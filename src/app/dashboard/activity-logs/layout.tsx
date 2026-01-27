import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Logs',
  description: 'Monitor user activity in your organization',
};

export default function ActivityLogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
