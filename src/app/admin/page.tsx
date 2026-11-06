import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Fetch initial data on the server
  const [rounds, auditLogs] = await Promise.all([
    prisma.round.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        exclusions: { select: { number: true } },
        winners: { orderBy: { order: "asc" } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return <AdminDashboardClient session={session} initialRounds={rounds} initialAuditLogs={auditLogs} />;
}
