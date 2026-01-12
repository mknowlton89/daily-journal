import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
export default function LogoutButton() {
  const session = useSession();
  const router = useRouter();

  if (!session || session.status === "unauthenticated") {
    return null;
  }

  return (
    <button
      onClick={async () => {
        await signOut({
          redirect: false,
        });
        router.push("/login");
      }}
    >
      <div className="flex items-center gap-2">Logout</div>
    </button>
  );
}
