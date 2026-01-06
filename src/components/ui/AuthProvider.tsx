import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import Link from "next/link";
import { Button } from "./button";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProtectedPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const session = useSession();
  if (!session) return null;
  return (
    <>
      <div className="flex justify-between w-full p-4 border-b">
        <div className="font-bold">
          <Link href="/">JRNL</Link>
        </div>
        <div className="flex align-center gap-2">
          <Button onClick={() => router.push("/entries/new")}>
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
