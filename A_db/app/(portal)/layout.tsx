import { AdminShell } from "@/components/admin-shell";
import { AdminGuard } from "@/providers/auth-provider";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
