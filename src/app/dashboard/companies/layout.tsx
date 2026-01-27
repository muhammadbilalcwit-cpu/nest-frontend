import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Companies',
  description: 'Manage all registered companies',
};

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
