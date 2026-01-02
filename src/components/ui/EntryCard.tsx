"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { useState } from "react";
import { Button } from "./button";

export default function EntryCard() {
  const [entryValue, setEntryValue] = useState({
    content: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: { userId: string; content: string } = {
        userId: "1", // Hardcoded for MVP
        content: entryValue.content,
      };
      const res = await fetch("/api/auth/entries", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log(res);
    } catch (error) {
      console.error(error);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-4/5">
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s on your mind?</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <Textarea
              className="min-h-[200px]"
              value={entryValue.content}
              onChange={(e) => setEntryValue({ content: e.target.value })}
            />
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={async () => await handleSubmit()}
          >
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
