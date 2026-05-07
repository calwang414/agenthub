export function toCamelCase<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

export function toCamelCaseArray<T = Record<string, unknown>>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => toCamelCase<T>(item));
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
