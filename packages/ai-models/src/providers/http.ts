/** Best-effort extraction of a human-readable error message from a failed response. */
export async function safeErrorText(res: Response): Promise<string> {
  try {
    const body = await res.text();
    try {
      const json = JSON.parse(body);
      return json?.error?.message ?? json?.message ?? body.slice(0, 300);
    } catch {
      return body.slice(0, 300);
    }
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}
