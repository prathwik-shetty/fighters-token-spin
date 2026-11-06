import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: params.roundId },
      include: {
        exclusions: { select: { number: true } },
        winners: { orderBy: { order: "asc" } },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const now = Date.now();
    let currentStatus = round.status;

    // Check if the spin duration has elapsed and status is still SPINNING
    if (round.status === "SPINNING" && round.spinStartTime) {
      const elapsed = now - new Date(round.spinStartTime).getTime();
      if (elapsed >= round.spinDurationMs) {
        currentStatus = "COMPLETED";
        // Transition in DB asynchronously
        await prisma.round
          .update({
            where: { id: round.id },
            data: { status: "COMPLETED" },
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      round: {
        id: round.id,
        name: round.name,
        rangeStart: round.rangeStart,
        rangeEnd: round.rangeEnd,
        winnersCount: round.winnersCount,
        status: currentStatus,
        spinStartTime: round.spinStartTime?.toISOString() || null,
        spinDurationMs: round.spinDurationMs,
        isTestRound: round.isTestRound,
        exclusions: round.exclusions.map((e) => e.number),
        winners: round.winners.map((w) => ({ number: w.number, order: w.order })),
        seed: currentStatus === "COMPLETED" ? round.seed : null,
        commitHash: round.commitHash,
      },
    });
  } catch (error) {
    console.error("Public get round error:", error);
    return NextResponse.json({ error: "Failed to fetch round" }, { status: 500 });
  }
}
