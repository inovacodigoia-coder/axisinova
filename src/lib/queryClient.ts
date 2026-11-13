import { QueryClient } from '@tanstack/react-query'

/** Cliente único do React Query (usado pelo App, logout por inatividade e retomada do tempo real). */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 45_000, refetchOnWindowFocus: false } },
})
