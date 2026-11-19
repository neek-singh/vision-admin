import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('Supabase URL or Anon Key is missing from environment variables!')
  }
}

// Resilient fetch wrapper with auto-retry on network blips or dev-server reloads
const resilientFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(input, init)
  } catch (err: any) {
    if (
      err?.name === 'TypeError' || 
      err?.message?.includes('fetch') || 
      err?.message?.includes('Failed')
    ) {
      // Wait briefly for network/dev-proxy to reconnect, then retry
      await new Promise((res) => setTimeout(res, 800))
      try {
        return await fetch(input, init)
      } catch (retryErr) {
        throw retryErr
      }
    }
    throw err
  }
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: resilientFetch,
    },
    auth: {
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn()
      },
    },
  }
)
