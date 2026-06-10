export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  retryAfter?: number;
}

export const successResponse = <T = any>(data?: T, message: string = "Success"): ApiResponse<T> => ({
  success: true,
  message,
  ...(data !== undefined && { data }),
});

export const errorResponse = (message: string, retryAfter?: number): ApiResponse => ({
  success: false,
  message,
  ...(retryAfter !== undefined && { retryAfter }),
});

export const validationError = (message: string = "Validation failed"): ApiResponse => ({
  success: false,
  message,
});
