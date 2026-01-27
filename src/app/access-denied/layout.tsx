import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Denied',
  description: 'You do not have permission to access this resource',
};

export default function AccessDeniedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
