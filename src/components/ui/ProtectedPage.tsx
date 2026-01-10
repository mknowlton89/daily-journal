import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import { Button } from "./button";
import { PlusIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { postApi } from "@/lib/hooks/useApi";
import { EntryInterface } from "@/app/lib/types/Entry/entries";
import { cn } from "@/lib/utils";

export default function ProtectedPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const isEntryPage = pathname.includes("/entries/");
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
      {session.status === "authenticated" && !isEntryPage && (
        <div className="flex justify-between w-full p-4 border-b items-center">
          <div className="font-bold">
            <Link href="/">JRNL</Link>
          </div>
          <div className="flex align-center gap-2">
            <Button
              onClick={async () => await handleNewEntry()}
              className="rounded-full"
              size="sm"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
            <LogoutButton />
          </div>
        </div>
      )}
      <div className={cn("p-6", isEntryPage ? "p-0" : "")}>{children}</div>
    </>
  );
}
