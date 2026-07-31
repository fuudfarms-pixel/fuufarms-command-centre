import type { Metadata, Viewport } from 'next';
import { Commissioner, Roboto } from 'next/font/google';
import './globals.css';

// Brand typefaces, self-hosted through next/font. Both are genuine Google Fonts,
// so this matches the design system exactly rather than substituting.
const commissioner = Commissioner({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-commissioner',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Command Centre — Fuud Farms Limited',
  description: 'Capital, inventory, orders and assets for Fuud Farms Limited.',
  robots: { index: false, follow: false }, // internal tool; never index
};

export const viewport: Viewport = {
  themeColor: '#315c2b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${commissioner.variable} ${roboto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
