import { ProtectedAppShell } from "@/components/protected-app-shell";
import { requireAuthorizedSession } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuthorizedSession();

  return <ProtectedAppShell userEmail={session.email}>{children}</ProtectedAppShell>;
}
