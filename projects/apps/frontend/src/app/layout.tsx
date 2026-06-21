import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SMASTE',
  description: 'Student management and training evaluation system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
