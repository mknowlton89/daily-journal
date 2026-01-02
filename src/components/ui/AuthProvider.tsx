import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";

export default function ProtectedPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = useSession();
  if (session.status === "loading") {
    return <div>Loading...</div>;
  }
  return (
    <>
      <LogoutButton />
      {children}
    </>
  );
}
