import { useCallback, useState } from "react";

export function useLoadingState() {
  const [isLoading, setIsLoading] = useState(false);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await fn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, withLoading };
}
