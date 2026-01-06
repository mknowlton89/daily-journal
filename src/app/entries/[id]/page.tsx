"use client";
import { EntryInterface } from "@/app/lib/types/Entry/entries";
import { useApi } from "@/lib/hooks/useApi";
import { useParams } from "next/navigation";

export default function EntryPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, error, isLoading, mutate } = useApi<EntryInterface>(
    id ? `/api/auth/entries/${id}` : null
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }
  return <div>Entry Page</div>;
}
