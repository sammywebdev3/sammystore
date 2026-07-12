import { ReactNode } from 'react';

export const metadata = {
  title: 'Virtual Numbers - SammyStore',
  description: 'Get instant SMS verification numbers worldwide'
};

export default function NumbersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
