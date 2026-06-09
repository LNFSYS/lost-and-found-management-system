export function ok<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message
  };
}

export function created<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message
  };
}

export function fail(error: string, message?: string, detail?: unknown) {
  return {
    success: false,
    error,
    message,
    detail
  };
}
