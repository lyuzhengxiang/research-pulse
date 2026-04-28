import type { Metadata } from 'next';
import { JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { Masthead } from '@/components/Masthead';
import { Colophon } from '@/components/Colophon';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'The Research Almanac',
  description: 'A daily ledger of papers in motion — arXiv, GitHub, and Hacker News, set in print.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <Masthead />
        <main>{children}</main>
        <Colophon />
      </body>
    </html>
  );
}
