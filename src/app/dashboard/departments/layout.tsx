import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Departments',
  description: 'Manage organization departments',
};

export default function DepartmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
