import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users',
  description: 'Manage department users and roles',
};

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
