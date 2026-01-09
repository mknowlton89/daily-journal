import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import { Button } from "./button";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { postApi } from "@/lib/hooks/useApi";
import { EntryInterface } from "@/app/lib/types/Entry/entries";

export default function ProtectedPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const session = useSession();
  if (!session) return null;

  async function handleNewEntry() {
    try {
      const { data } = await postApi<EntryInterface>("/api/auth/entries", {});
      router.push(`/entries/${data.id}`);
    } catch (error) {
      console.error("Failed to create entry:", error);
    }
  }
  return (
    <>
      <div className="flex justify-between w-full p-4 border-b">
        <div className="font-bold">
          <Link href="/">JRNL</Link>
        </div>
        <div className="flex align-center gap-2">
          <Button onClick={async () => await handleNewEntry()}>
            <PlusIcon className="w-4 h-4" />
            New Entry
          </Button>
          <LogoutButton />
        </div>
      </div>
      <div className="p-6">{children}</div>
    </>
  );
}
