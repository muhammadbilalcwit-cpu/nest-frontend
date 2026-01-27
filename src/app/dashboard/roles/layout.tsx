import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roles',
  description: 'View and manage user roles',
};

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
