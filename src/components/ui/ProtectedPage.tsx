import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "./dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FaBars } from "react-icons/fa6";
import { useTheme } from "next-themes";

export default function ProtectedPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isJournalRoute =
    pathname === "/" ||
    pathname.startsWith("/day") ||
    pathname.startsWith("/entries");
  const session = useSession();
  if (!session) return null;

  return (
    <>
      {/* MKTODO: Convert to a component to make the code easier to read*/}
      {session.status === "authenticated" && !isJournalRoute && (
        <div className="flex justify-between w-full p-4 border-b items-center">
          <div className="font-bold">
            <Link href="/">JRNL</Link>
          </div>
          <div className="flex align-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <span role="button" className="cursor-pointer">
                  <FaBars size={24} />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Choose theme</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuCheckboxItem
                        checked={theme === "light"}
                        onCheckedChange={() => setTheme("light")}
                      >
                        Light mode
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={theme === "dark"}
                        onCheckedChange={() => setTheme("dark")}
                      >
                        Dark mode
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={theme === "system"}
                        onCheckedChange={() => setTheme("system")}
                      >
                        System mode
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={async () => {
                    await signOut({
                      redirect: false,
                    });
                    router.push("/login");
                  }}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      <div className={cn(!isJournalRoute && "p-6")}>{children}</div>
    </>
  );
}
