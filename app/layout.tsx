import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '装備抽選シミュレーター — Elin',
  description: '装備とレアリティを選んで、圧縮済みスキャンデータから条件に合うUIDを検索できます。',
  metadataBase: new URL('https://uid-simulator-elin.ardent-crumb-7770.chatgpt.site'),
  openGraph: {
    title: '装備抽選シミュレーター — Elin',
    description: '装備とレアリティからUIDを検索。',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '装備抽選シミュレーター — Elin',
    description: '装備とレアリティからUIDを検索。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
