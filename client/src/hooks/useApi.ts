import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { ApiResponse } from '../types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    config?: any
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let response: ApiResponse<T>;

      switch (method) {
        case 'get':
          response = await apiService.get<T>(url, config);
          break;
        case 'post':
          response = await apiService.post<T>(url, data, config);
          break;
        case 'put':
          response = await apiService.put<T>(url, data, config);
          break;
        case 'patch':
          response = await apiService.patch<T>(url, data, config);
          break;
        case 'delete':
          response = await apiService.delete<T>(url, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      setState({
        data: response.data,
        loading: false,
        error: null,
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });

      return null;
    }
  }, []);

  const get = useCallback((url: string, config?: any) => execute('get', url, undefined, config), [execute]);
  const post = useCallback((url: string, data?: any, config?: any) => execute('post', url, data, config), [execute]);
  const put = useCallback((url: string, data?: any, config?: any) => execute('put', url, data, config), [execute]);
  const patch = useCallback((url: string, data?: any, config?: any) => execute('patch', url, data, config), [execute]);
  const del = useCallback((url: string, config?: any) => execute('delete', url, undefined, config), [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    get,
    post,
    put,
    patch,
    delete: del,
    reset,
  };
}