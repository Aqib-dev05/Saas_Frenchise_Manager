'use client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { store } from '@/store'
import { useState } from 'react'
import AuthHydrator from './AuthHydrator'

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: false },
    },
  }))

  return (
    <Provider store={store}>
      <AuthHydrator />
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            success: { style: { background: '#10b981', color: '#fff' } },
            error: { style: { background: '#ef4444', color: '#fff' } },
            duration: 3000,
          }}
        />
      </QueryClientProvider>
    </Provider>
  )
}