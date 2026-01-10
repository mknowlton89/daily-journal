"use client";
import { EntryInterface } from "@/app/lib/types/Entry/entries";
import { useApi } from "@/lib/hooks/useApi";
import { useParams } from "next/navigation";
import EntryCard from "@/components/ui/EntryCard";

export default function EntryPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, error, isLoading } = useApi<EntryInterface>(
    id ? `/api/auth/entries/${id}` : null
  );

  return (
    <div>
      <div className="flex flex-col items-center justify-center">
        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div>Error: {error.message}</div>
        ) : (
          <EntryCard
            key={id}
            entryId={id}
            content={data?.content}
            dateUpdated={
              data?.dateUpdated ? new Date(data.dateUpdated).getTime() : 0
            }
          />
        )}
      </div>
    </div>
  );
}
