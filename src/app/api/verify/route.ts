import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCommitHash, computeCommitHash } from "@/lib/spin-engine";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roundId } = body;

    if (!roundId || typeof roundId !== "string") {
      return NextResponse.json({ error: "Round ID is required" }, { status: 400 });
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId.trim() },
      include: {
        winners: { orderBy: { order: "asc" } },
        admin: { select: { name: true, email: true } },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (!round.commitHash) {
      return NextResponse.json(
        { error: "This round has not been spun yet or has no commit hash recorded" },
        { status: 400 }
      );
    }

    if (!round.seed) {
      return NextResponse.json(
        { error: "Seed has not yet been revealed for this round" },
        { status: 400 }
      );
    }

    const winnerNumbers = round.winners.map((w) => w.number);
    const computedHash = computeCommitHash(round.id, round.seed, winnerNumbers);
    const isValid = verifyCommitHash(round.id, round.seed, winnerNumbers, round.commitHash);

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await createAuditLog({
      action: "VERIFY_RESULT",
      details: {
        roundId: round.id,
        isValid,
        computedHash,
        storedHash: round.commitHash,
      },
      ipAddress,
    });

    return NextResponse.json({
      verified: isValid,
      round: {
        id: round.id,
        name: round.name,
        rangeStart: round.rangeStart,
        rangeEnd: round.rangeEnd,
        winners: winnerNumbers,
        seed: round.seed,
        storedCommitHash: round.commitHash,
        recomputedCommitHash: computedHash,
        spinStartTime: round.spinStartTime,
        status: round.status,
        adminName: round.admin.name,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
