export async function apiFetch(
    path: string,
    options?: RequestInit
  ) {
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "API error");
    }
  
    return res.json();
  }
  