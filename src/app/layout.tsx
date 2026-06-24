import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Commercial Dashboard · Delhi Division · NR',
  description: 'Delhi Division Commercial Branch Operations Dashboard — Northern Railway',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Light mode only — remove any stale dark class immediately, before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.remove('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-surface-page" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
