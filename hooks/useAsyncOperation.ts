import { useState, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface UseAsyncOperationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncOperationState {
  loading: boolean;
  error: Error | null;
  data: any;
}

export const useAsyncOperation = (
  asyncFn: () => Promise<any>,
  options: UseAsyncOperationOptions = {}
) => {
  const [state, setState] = useState<UseAsyncOperationState>({
    loading: false,
    error: null,
    data: null,
  });

  const { addToast } = useToast();

  const execute = useCallback(async () => {
    setState({ loading: true, error: null, data: null });

    try {
      const result = await asyncFn();
      setState({ loading: false, error: null, data: result });

      if (options.successMessage) {
        addToast(options.successMessage, 'success');
      }

      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ loading: false, error: err, data: null });

      const message = options.errorMessage || err.message || 'An error occurred';
      addToast(message, 'error');

      options.onError?.(err);
      throw err;
    }
  }, [asyncFn, options, addToast]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

export default useAsyncOperation;
