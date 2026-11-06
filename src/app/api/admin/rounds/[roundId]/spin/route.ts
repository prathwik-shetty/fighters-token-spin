import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import {
  buildEligibleNumbers,
  selectWinners,
  generateSeed,
  computeCommitHash,
} from "@/lib/spin-engine";
import { checkRateLimit, acquireSpinLock, releaseSpinLock } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { roundId: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roundId } = params;
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  // 1. Rate-limit spin requests per admin/IP
  const rateLimit = checkRateLimit(`spin_${session.adminId}_${ipAddress}`, 15, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  // 2. Concurrency Lock: Ensure only one active spin per round at a time
  if (!acquireSpinLock(roundId)) {
    return NextResponse.json(
      { error: "A spin is already in progress for this round." },
      { status: 409 }
    );
  }

  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { exclusions: true, winners: true },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    // Check if round was already spun and is not a test round
    if (round.status === "COMPLETED" && !round.isTestRound) {
      return NextResponse.json(
        { error: "This round has already completed and cannot be spun again (not a test round)." },
        { status: 400 }
      );
    }

    if (round.status === "SPINNING") {
      return NextResponse.json(
        { error: "This round is currently spinning." },
        { status: 400 }
      );
    }

    // If re-running a test round, clear previous winners
    if (round.status === "COMPLETED" && round.isTestRound) {
      await prisma.winner.deleteMany({ where: { roundId } });
    }

    // 3. Build eligible numbers list
    const excludedNumbers = round.exclusions.map((e) => e.number);
    const eligible = buildEligibleNumbers(round.rangeStart, round.rangeEnd, excludedNumbers);

    if (eligible.length < round.winnersCount) {
      return NextResponse.json(
        {
          error: `Not enough eligible numbers (${eligible.length}) for requested winners (${round.winnersCount})`,
        },
        { status: 400 }
      );
    }

    // 4. Select winner(s) using Node.js CSPRNG or predetermined target winner if configured
    let winners: number[];
    if (round.targetWinner && eligible.includes(round.targetWinner)) {
      const remainingPool = eligible.filter((n) => n !== round.targetWinner);
      const additionalWinners =
        round.winnersCount > 1 ? selectWinners(remainingPool, round.winnersCount - 1) : [];
      winners = [round.targetWinner, ...additionalWinners];
    } else {
      winners = selectWinners(eligible, round.winnersCount);
    }

    // 5. Generate seed and compute SHA-256 commit hash
    const seed = generateSeed();
    const commitHash = computeCommitHash(round.id, seed, winners);

    const spinDurationMs = 8000; // 8 seconds fixed duration
    const spinStartTime = new Date();

    // 6. Update round with status, seed, commitHash, spinStartTime
    await prisma.$transaction(async (tx) => {
      // Create Winner rows
      for (let i = 0; i < winners.length; i++) {
        await tx.winner.create({
          data: {
            roundId: round.id,
            number: winners[i],
            order: i + 1,
            drawnAt: new Date(spinStartTime.getTime() + spinDurationMs),
          },
        });
      }

      // Update Round
      await tx.round.update({
        where: { id: round.id },
        data: {
          status: "SPINNING",
          spinStartTime,
          spinDurationMs,
          seed,
          commitHash,
        },
      });

      // Save SpinLog entry
      await tx.spinLog.create({
        data: {
          roundId: round.id,
          adminId: session.adminId,
          seed,
          commitHash,
          resultsJson: JSON.stringify(winners),
          ipAddress,
        },
      });
    });

    // 7. Audit log
    await createAuditLog({
      action: "START_SPIN",
      adminId: session.adminId,
      adminEmail: session.email,
      details: {
        roundId: round.id,
        roundName: round.name,
        winners,
        seed,
        commitHash,
        isTestRound: round.isTestRound,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      roundId: round.id,
      status: "SPINNING",
      spinStartTime: spinStartTime.toISOString(),
      spinDurationMs,
      winners, // Server decided result
      seed,
      commitHash,
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json({ error: "Failed to execute spin" }, { status: 500 });
  } finally {
    releaseSpinLock(roundId);
  }
}
