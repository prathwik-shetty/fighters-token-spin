import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { createRoundSchema } from "@/lib/validations";
import { buildEligibleNumbers } from "@/lib/spin-engine";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rounds = await prisma.round.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        exclusions: { select: { number: true } },
        winners: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error("Fetch rounds error:", error);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createRoundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, rangeStart, rangeEnd, exclusions = [], winnersCount, isTestRound, targetWinner } = parsed.data;

    // Build eligible numbers list
    const eligibleNumbers = buildEligibleNumbers(rangeStart, rangeEnd, exclusions);

    const round = await prisma.round.create({
      data: {
        name,
        rangeStart,
        rangeEnd,
        winnersCount,
        isTestRound,
        targetWinner: targetWinner && eligibleNumbers.includes(targetWinner) ? targetWinner : null,
        status: "WAITING",
        createdByAdminId: session.adminId,
        exclusions: {
          create: Array.from(new Set(exclusions)).map((num) => ({
            number: num,
          })),
        },
      },
      include: {
        exclusions: true,
        admin: { select: { id: true, name: true, email: true } },
        winners: true,
      },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await createAuditLog({
      action: "CREATE_ROUND",
      adminId: session.adminId,
      adminEmail: session.email,
      details: {
        roundId: round.id,
        roundName: round.name,
        range: `${rangeStart} - ${rangeEnd}`,
        exclusionsCount: exclusions.length,
        eligibleCount: eligibleNumbers.length,
        isTestRound,
      },
      ipAddress,
    });

    return NextResponse.json(
      {
        round,
        eligibleSummary: {
          count: eligibleNumbers.length,
          preview: eligibleNumbers.slice(0, 50),
          totalRange: rangeEnd - rangeStart + 1,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create round error:", error);
    return NextResponse.json({ error: "Failed to create round" }, { status: 500 });
  }
}
