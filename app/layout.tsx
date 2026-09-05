import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UID Simulator — Elin Drop Forecast',
  description: 'UID ScannerのCSVからElinの装備ドロップ候補を探索するシミュレーター。',
  metadataBase: new URL('https://uid-simulator-elin.ardent-crumb-7770.chatgpt.site'),
  openGraph: {
    title: 'UID Simulator',
    description: 'Elin Drop Forecast — CSVから次の装備ドロップをUIDで先読み。',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UID Simulator',
    description: 'Elin Drop Forecast — CSVから次の装備ドロップをUIDで先読み。',
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
