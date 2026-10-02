function isTransientGeminiError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error
    ? error.status
    : "response" in error && error.response && typeof error.response === "object" && "status" in error.response
      ? error.response.status
      : undefined;
  return typeof status === "number" && (status === 429 || status >= 500);
}

export async function retryTransientGemini<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === attempts - 1) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
  throw new Error("Gemini request failed after retries");
}