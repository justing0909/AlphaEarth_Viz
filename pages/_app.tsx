import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import 'leaflet/dist/leaflet.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function MyApp({ Component, pageProps }: AppProps) {
  const [qc] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={qc}>
      <Component {...pageProps} />
    </QueryClientProvider>
  )
}
