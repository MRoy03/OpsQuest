import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/auth/AuthProvider'
import AppShell from '@/components/layout/AppShell'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OpsQuest — Smart IT Issue Predictor',
  description: 'Predict, prevent, and auto-resolve IT issues with gamified operations.',
}

// Inline script that runs before the first paint to apply the stored theme,
// preventing a flash of the wrong theme (FOUT) on page load.
const antiFoucScript = `
(function(){
  try {
    var t = localStorage.getItem('opsquest-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch(e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: ThemeProvider sets data-theme on <html> client-side;
    // the attribute value may differ between SSR and first client render.
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: antiFoucScript }} />
      </head>
      <body className="flex min-h-screen bg-[#060b18] text-[#e2e8f0] antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
