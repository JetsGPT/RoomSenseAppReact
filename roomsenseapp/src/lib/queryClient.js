import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized QueryClient instance with global configuration.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 30 seconds (increased from 10s to reduce lag on view switches)
            staleTime: 30000,
            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Refetch on window focus for better UX
            refetchOnWindowFocus: true,
            // Retry failed queries 3 times
            retry: 3,
            // Exponential backoff for retries
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
    },
});
