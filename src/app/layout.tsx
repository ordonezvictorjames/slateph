import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { InitialPageLoader } from '@/components/InitialPageLoader'
import './globals.css'

export const metadata: Metadata = {
  title: 'Slate - Modern Learning Management System',
  description: 'A comprehensive Learning Management System built with Next.js, React, and Supabase. Features include course management, user authentication, scheduling, and analytics.',
  keywords: 'LMS, Learning Management System, Education, Courses, trainees, trainees, Online Learning, E-learning, Education Platform',
  authors: [{ name: 'Slate Team' }],
  creator: 'Slate Team',
  publisher: 'Slate',
  robots: 'index, follow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Slate'
  },
  openGraph: {
    title: 'Slate - Modern Learning Management System',
    description: 'A comprehensive Learning Management System for modern education',
    type: 'website',
    locale: 'en_US',
    siteName: 'Slate'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Slate - Modern Learning Management System',
    description: 'A comprehensive Learning Management System for modern education'
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Slate" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Favicon and Icons */}
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className="antialiased">
        <InitialPageLoader />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}