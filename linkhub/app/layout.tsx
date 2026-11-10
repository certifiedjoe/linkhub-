import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kiungo — Short links, smart routing and bio pages',
  description:
    'Create short links, route visitors to the right destination, track clicks and build a shareable bio page in one workspace.',
  openGraph: {
    title: 'Kiungo — One link for everything you share',
    description: 'Short links, smart destinations, click analytics and bio pages for creators and businesses.',
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
