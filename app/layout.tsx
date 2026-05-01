import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'حلي باش تولي - الحلويات الجزائرية الأصيلة',
  description: 'اطلب أشهى الحلويات، تعلم صنعها، وانضم لمجتمع صانعي الحلوى مع حلي باش تولي',
  keywords: 'حلويات، طلب حلويات، ورشات حلويات، صانع حلوى، حلويات جزائرية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'Cairo, sans-serif',
              direction: 'rtl',
              borderRadius: '16px',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
