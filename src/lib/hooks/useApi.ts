import useSWR, { SWRConfiguration } from "swr";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw error;
  }

  return res.json();
}

export function useApi<T>(key: string | null, options?: SWRConfiguration) {
  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}
