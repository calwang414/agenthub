export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export function toCamelCaseArray(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  return arr.map(toCamelCase);
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function error(message: string): ApiResponse<never> {
  return { success: false, error: message };
}

export function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return Response.json(data, {
    status: data.success ? status : status >= 400 ? status : 400,
  });
}
