import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OpsQuest — Smart IT Issue Predictor',
  description: 'Predict, prevent, and auto-resolve IT issues with gamified operations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen bg-[#060b18] text-[#e2e8f0] antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  )
}
