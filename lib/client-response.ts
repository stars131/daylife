export type ApiErrorBody = {
  error?: string;
};

export async function readJsonResponse<T>(response: Response): Promise<Partial<T> & ApiErrorBody> {
  try {
    return (await response.json()) as Partial<T> & ApiErrorBody;
  } catch {
    return {};
  }
}

export async function assertOkJson<T>(response: Response, fallbackMessage: string): Promise<Partial<T> & ApiErrorBody> {
  const data = await readJsonResponse<T>(response);
  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}
