import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rounds = await prisma.round.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true, email: true } },
        exclusions: { select: { number: true } },
        winners: { orderBy: { order: "asc" } },
      },
    });

    const headers = [
      "Round ID",
      "Round Name",
      "Status",
      "Is Test",
      "Range Start",
      "Range End",
      "Total Range",
      "Excluded Numbers",
      "Excluded Count",
      "Winners Count",
      "Winning Numbers",
      "Spin Start Time",
      "Commit Hash",
      "Revealed Seed",
      "Admin Name",
      "Admin Email",
      "Created At",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = rounds.map((r) => {
      const exclusions = r.exclusions.map((e) => e.number).sort((a, b) => a - b).join("; ");
      const winners = r.winners.map((w) => w.number).join("; ");
      const totalRange = r.rangeEnd - r.rangeStart + 1;

      return [
        escapeCsv(r.id),
        escapeCsv(r.name),
        escapeCsv(r.status),
        escapeCsv(r.isTestRound ? "YES" : "NO"),
        escapeCsv(r.rangeStart),
        escapeCsv(r.rangeEnd),
        escapeCsv(totalRange),
        escapeCsv(exclusions),
        escapeCsv(r.exclusions.length),
        escapeCsv(r.winnersCount),
        escapeCsv(winners),
        escapeCsv(r.spinStartTime ? r.spinStartTime.toISOString() : ""),
        escapeCsv(r.commitHash || ""),
        escapeCsv(r.seed || ""),
        escapeCsv(r.admin?.name || ""),
        escapeCsv(r.admin?.email || ""),
        escapeCsv(r.createdAt.toISOString()),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await createAuditLog({
      action: "EXPORT_ROUNDS_CSV",
      adminId: session.adminId,
      adminEmail: session.email,
      details: { totalRoundsExported: rounds.length },
      ipAddress,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fighters-token-spin-history-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
