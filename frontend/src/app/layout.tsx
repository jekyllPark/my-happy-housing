import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: '나의 행복주택',
  description: '출퇴근이 편한 행복주택을 찾아보세요',
  keywords: '행복주택, 국민주택, 전세, 부동산, 주거',
  authors: [{ name: '나의 행복주택 팀' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex flex-col min-h-screen bg-gray-50">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
