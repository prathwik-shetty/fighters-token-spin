"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CasinoReel } from "@/components/CasinoReel";
import { ShieldCheck, Trophy, AlertCircle, RefreshCw, Radio } from "lucide-react";

interface RoundData {
  id: string;
  name: string;
  rangeStart: number;
  rangeEnd: number;
  winnersCount: number;
  status: "WAITING" | "SPINNING" | "COMPLETED";
  spinStartTime: string | null;
  spinDurationMs: number;
  isTestRound: boolean;
  exclusions: number[];
  winners: { number: number; order: number }[];
  seed: string | null;
  commitHash: string | null;
}

export default function PublicSpinPage() {
  const params = useParams();
  const roundId = params?.roundId as string;

  const [round, setRound] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch initial round data
  const fetchRound = async () => {
    try {
      const res = await fetch(`/api/rounds/${roundId}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Round not found" : "Failed to load round");
      }
      const data = await res.json();
      setRound(data.round);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading round");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roundId) return;
    fetchRound();

    // Subscribe to SSE updates
    const eventSource = new EventSource(`/api/rounds/${roundId}/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRound((prev) => ({
          ...prev,
          ...data,
        }));
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [roundId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-amber-300 font-mono tracking-widest text-sm">CONNECTING TO LIVE SPIN ARENA...</p>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-8 rounded-2xl text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-200 mb-2">Round Unavailable</h1>
          <p className="text-slate-400 mb-6">{error || "This round does not exist or has expired."}</p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold transition-all border border-slate-700"
          >
            Check Hash on Verify Page
          </Link>
        </div>
      </div>
    );
  }

  const isSpinning = round.status === "SPINNING";
  const isCompleted = round.status === "COMPLETED";
  const primaryWinner = round.winners.length > 0 ? round.winners[0].number : null;

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Header bar */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center font-black text-black text-lg shadow-md">
              F
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">Fighters Token Spin</span>
              {round.isTestRound && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-mono">
                  TEST ROUND
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live SSE status indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
              <Radio
                className={`w-3.5 h-3.5 ${
                  connected ? "text-emerald-400 animate-pulse" : "text-amber-500"
                }`}
              />
              <span>{connected ? "LIVE FEED" : "SYNCING"}</span>
            </div>

            <Link
              href={`/verify?roundId=${round.id}`}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Fairness</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center">
        {/* Round Title & Description */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3 uppercase tracking-wider">
            Round Status: {round.status}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-sm mb-3">
            {round.name}
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Token pool range: <span className="font-mono text-white font-bold">{round.rangeStart} to {round.rangeEnd}</span>
            {round.exclusions.length > 0 && (
              <span className="text-slate-500 ml-1">
                ({round.exclusions.length} excluded)
              </span>
            )}
            {" • "}Winners to draw: <span className="font-mono text-white font-bold">{round.winnersCount}</span>
          </p>
        </div>

        {/* Casino Reel Animation Area */}
        <div className="w-full my-4 flex flex-col items-center">
          <CasinoReel
            rangeStart={round.rangeStart}
            rangeEnd={round.rangeEnd}
            targetNumber={primaryWinner}
            isSpinning={isSpinning}
            durationMs={round.spinDurationMs || 8000}
            spinStartTime={round.spinStartTime}
            onComplete={() => {
              setRound((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
            }}
          />
        </div>

        {/* Multi-winner list if more than 1 winner drawn */}
        {round.winners.length > 1 && isCompleted && (
          <div className="w-full max-w-md mt-6 p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 backdrop-blur shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-3 text-sm uppercase tracking-wide">
              <Trophy className="w-4 h-4" />
              <span>All Winning Tokens Drawn</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {round.winners.map((w) => (
                <div
                  key={w.order}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800"
                >
                  <span className="text-xs text-slate-400 font-mono">Winner #{w.order}</span>
                  <span className="text-lg font-black font-mono text-amber-300">
                    Token #{w.number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provably Fair Commitment Box */}
        <div className="w-full max-w-md mt-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-sans font-semibold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic Commitment
            </span>
            <Link
              href={`/verify?roundId=${round.id}`}
              className="text-amber-400 hover:underline"
            >
              Verify Seed
            </Link>
          </div>

          <div className="space-y-1.5 text-slate-400">
            <div>
              <span className="text-slate-500">SHA-256 Commit:</span>
              <p className="text-slate-300 break-all bg-slate-950 p-2 rounded border border-slate-800/80">
                {round.commitHash || "Will be generated upon spin trigger"}
              </p>
            </div>

            {round.seed && (
              <div>
                <span className="text-slate-500">Revealed Seed:</span>
                <p className="text-amber-300/90 break-all bg-slate-950 p-2 rounded border border-slate-800/80">
                  {round.seed}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Fighters Token Spin • Provably Fair CSPRNG System</p>
      </footer>
    </div>
  );
}
