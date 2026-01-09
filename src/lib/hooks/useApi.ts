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

type ApiResponse<T, Status extends number> = {
  data: T;
  status: Status;
};

export async function postApi<T>(
  url: string,
  body: unknown
): Promise<ApiResponse<T, 201>> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw error;
  }

  const data = await res.json();
  return { data, status: res.status as 201 };
}
