import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kiungo — One link for everything you share',
  description:
    'Build a profile page in minutes: add your photo, add every link you want people to tap, and share one address across all your social networks.',
  openGraph: {
    title: 'Kiungo — One link for everything you share',
    description: 'Your photo, your links, one shareable address. Built for creators and small businesses.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=clash-display@500,600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__KIUNGO_API__ = "__PORT_8000__";
try{if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
