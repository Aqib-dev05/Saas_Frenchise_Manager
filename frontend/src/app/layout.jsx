import Providers from '@/providers/Providers'
import './globals.css'

export const metadata = {
  title: 'Franchise Manager — POS & Distribution SaaS',
  description: 'Complete franchise distribution management: salesman routes, order booking, delivery tracking, inventory and billing.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
