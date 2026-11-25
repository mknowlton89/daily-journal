"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function accountInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source[0]?.toUpperCase() ?? "";
}

export default function AccountMenu({ onDelete }: { onDelete?: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data } = useSession();
  const name = data?.user?.name;
  const email = data?.user?.email;
  const initials = accountInitials(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={name || email ? `Account menu for ${name || email}` : "Account menu"}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#d4b483]"
        >
          <Avatar className="size-7">
            {data?.user?.image && (
              <AvatarImage src={data.user.image} alt="" />
            )}
            <AvatarFallback className="bg-[#eadfce] text-xs font-medium text-[#6d5330] dark:bg-[#3a3228] dark:text-[#d4b483]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onDelete && (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete entry
          </DropdownMenuItem>
        )}
        {onDelete && <DropdownMenuSeparator />}
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-500"
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/login");
          }}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
