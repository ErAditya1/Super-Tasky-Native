// lib/withHandler.ts
import { ApiResponse } from '@/types/ApiResponse';
import { AxiosError } from 'axios';

interface HandlerResponse<T = any> {
  success: boolean;
  status:number,
  data?: T;
  title?: string;
  message?: string;
}

export const withHandler = async <T = any>(
  fn: () => Promise<any>
): Promise<HandlerResponse<T>> => {
  try {
    const res = await fn();
   
    return {
      status:res.status,
      success: true,
      data: res.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
   

    const message =
      axiosError.response?.data?.message ||
      axiosError.message ||
      'Something went wrong';
    
    return {
      status:axiosError.status!,
      success: false,
      message,
    };
  }
};
