"use client";

import { useApi } from "@/lib/hooks/useApi";
import { EntryInterface } from "./lib/types/Entry/entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, EditIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { data, error, isLoading } =
    useApi<EntryInterface[]>("/api/auth/entries");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data?.length) {
    return <div>No data - update empty state</div>;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen gap-4 w-full">
      {data.map((entry) => {
        return (
          <Card key={entry.id} className="w-full">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(entry.dateCreated).toLocaleDateString()}
                  </div>
                  <EditIcon
                    className="w-4 h-4"
                    onClick={() => router.push(`/entries/${entry.id}`)}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              This is where we should show a preview of the entry somehow.
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
