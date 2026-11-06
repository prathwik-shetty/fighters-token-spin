import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { buildEligibleNumbers } from "@/lib/spin-engine";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { roundId: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const round = await prisma.round.findUnique({
      where: { id: params.roundId },
      include: {
        exclusions: { select: { number: true } },
        winners: { orderBy: { order: "asc" } },
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const excludedNumbers = round.exclusions.map((e) => e.number);
    const eligible = buildEligibleNumbers(round.rangeStart, round.rangeEnd, excludedNumbers);

    return NextResponse.json({
      round,
      eligibleSummary: {
        count: eligible.length,
        numbers: eligible,
      },
    });
  } catch (error) {
    console.error("Get round error:", error);
    return NextResponse.json({ error: "Failed to get round" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { roundId: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const round = await prisma.round.findUnique({
      where: { id: params.roundId },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    // Allow setting / updating predetermined target winner
    if (body.targetWinner !== undefined) {
      const target = body.targetWinner ? parseInt(body.targetWinner, 10) : null;
      await prisma.round.update({
        where: { id: params.roundId },
        data: { targetWinner: target },
      });
      return NextResponse.json({ success: true, message: "Target winner updated", targetWinner: target });
    }

    if (!round.isTestRound) {
      return NextResponse.json(
        { error: "Only test rounds can be reset or re-run" },
        { status: 400 }
      );
    }

    // Reset winners and round status to WAITING
    await prisma.$transaction([
      prisma.winner.deleteMany({ where: { roundId: params.roundId } }),
      prisma.round.update({
        where: { id: params.roundId },
        data: {
          status: "WAITING",
          spinStartTime: null,
          seed: null,
          commitHash: null,
        },
      }),
    ]);

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await createAuditLog({
      action: "RESET_TEST_ROUND",
      adminId: session.adminId,
      adminEmail: session.email,
      details: { roundId: round.id, roundName: round.name },
      ipAddress,
    });

    return NextResponse.json({ success: true, message: "Round reset to WAITING" });
  } catch (error) {
    console.error("Reset round error:", error);
    return NextResponse.json({ error: "Failed to reset round" }, { status: 500 });
  }
}
