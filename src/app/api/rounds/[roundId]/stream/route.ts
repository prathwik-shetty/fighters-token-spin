import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { roundId: string } }
) {
  const { roundId } = params;

  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const round = await prisma.round.findUnique({
            where: { id: roundId },
            include: {
              exclusions: { select: { number: true } },
              winners: { orderBy: { order: "asc" } },
            },
          });

          if (!round) {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Round not found" })}\n\n`)
            );
            clearInterval(intervalId);
            controller.close();
            return;
          }

          const now = Date.now();
          let currentStatus = round.status;

          if (round.status === "SPINNING" && round.spinStartTime) {
            const elapsed = now - new Date(round.spinStartTime).getTime();
            if (elapsed >= round.spinDurationMs) {
              currentStatus = "COMPLETED";
              await prisma.round
                .update({
                  where: { id: round.id },
                  data: { status: "COMPLETED" },
                })
                .catch(() => {});
            }
          }

          const payload = {
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
            timestamp: Date.now(),
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

          // If completed, we can close the stream after a couple seconds
          if (currentStatus === "COMPLETED") {
            // Keep sending for 5 seconds to ensure all clients have synced, then close
            setTimeout(() => {
              try {
                clearInterval(intervalId);
                controller.close();
              } catch {
                // Ignore if already closed
              }
            }, 6000);
          }
        } catch {
          clearInterval(intervalId);
          try {
            controller.close();
          } catch {}
        }
      };

      // Send initial data immediately
      await sendUpdate();

      // Poll interval for real-time updates every 800ms
      intervalId = setInterval(sendUpdate, 800);

      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
