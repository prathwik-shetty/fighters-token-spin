"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, XCircle, CheckCircle2, ArrowLeft, Search, Hash } from "lucide-react";

interface VerificationResult {
  verified: boolean;
  round: {
    id: string;
    name: string;
    rangeStart: number;
    rangeEnd: number;
    winners: number[];
    seed: string;
    storedCommitHash: string;
    recomputedCommitHash: string;
    spinStartTime: string;
    status: string;
    adminName: string;
  };
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialRoundId = searchParams.get("roundId") || "";

  const [roundId, setRoundId] = useState(initialRoundId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async (idToVerify?: string) => {
    const targetId = (idToVerify || roundId).trim();
    if (!targetId) {
      setError("Please enter a valid Round ID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: targetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify round");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRoundId) {
      setRoundId(initialRoundId);
      handleVerify(initialRoundId);
    }
  }, [initialRoundId]);

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-10">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
          Provably Fair Verification
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Every Fighters Token Spin uses cryptographic SHA-256 commitments and CSPRNG.
          Verify the outcome integrity using the revealed server seed and commit hash below.
        </p>
      </div>

      {/* Verification Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Enter Round ID to Verify
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              placeholder="e.g. cly..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-sm"
            />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Verify Result</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Verification Results Display */}
      {result && (
        <div
          className={`border rounded-2xl p-6 shadow-2xl transition-all ${
            result.verified
              ? "bg-slate-900/90 border-emerald-500/50 shadow-emerald-500/10"
              : "bg-slate-900/90 border-red-500/50 shadow-red-500/10"
          }`}
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              {result.verified ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">
                  {result.verified ? "100% Cryptographically Verified" : "Verification Failed"}
                </h3>
                <p className="text-xs text-slate-400">
                  {result.verified
                    ? "The revealed seed, round ID, and drawn winner produce the exact committed SHA-256 hash."
                    : "The computed hash does not match the stored commit hash."}
                </p>
              </div>
            </div>

            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase ${
                result.verified
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}
            >
              {result.verified ? "Fair & Tamper-Proof" : "Mismatch"}
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Round Name</span>
                <span className="text-white font-sans font-semibold text-sm">
                  {result.round.name}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Winning Token(s)</span>
                <span className="text-amber-400 font-bold text-base">
                  {result.round.winners.map((w) => `#${w}`).join(", ")}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block mb-1">Revealed Seed</span>
              <p className="text-amber-300 break-all">{result.round.seed}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block mb-1">Stored Commit Hash (Pre-Commit)</span>
              <p className="text-slate-300 break-all">{result.round.storedCommitHash}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block mb-1">Recomputed Hash (sha256(roundId:seed:winners))</span>
              <p className="text-emerald-400 break-all">{result.round.recomputedCommitHash}</p>
            </div>

            <div className="pt-2 text-right">
              <Link
                href={`/spin/${result.round.id}`}
                className="text-amber-400 hover:text-amber-300 text-xs font-sans font-semibold underline"
              >
                View Live Spin Page for this Round &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#07070d] text-white">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </div>
  );
}
