"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CasinoReel } from "@/components/CasinoReel";
import {
  Play,
  RotateCcw,
  PlusCircle,
  History,
  FileSpreadsheet,
  Shield,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trophy,
  Filter,
} from "lucide-react";

interface AdminSession {
  adminId: string;
  email: string;
  name: string;
}

interface RoundItem {
  id: string;
  name: string;
  rangeStart: number;
  rangeEnd: number;
  winnersCount: number;
  isTestRound: boolean;
  status: string;
  spinStartTime: Date | string | null;
  spinDurationMs: number;
  seed: string | null;
  commitHash: string | null;
  createdAt: Date | string;
  admin: { id: string; name: string; email: string };
  exclusions: { number: number }[];
  winners: { id?: string; number: number; order: number }[];
}

interface AuditLogItem {
  id: string;
  adminEmail: string | null;
  action: string;
  detailsJson: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
}

interface Props {
  session: AdminSession;
  initialRounds: RoundItem[];
  initialAuditLogs: AuditLogItem[];
}

export default function AdminDashboardClient({ session, initialRounds, initialAuditLogs }: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"arena" | "create" | "history" | "audit">("arena");
  const [rounds, setRounds] = useState<RoundItem[]>(initialRounds);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    initialRounds.length > 0 ? initialRounds[0].id : ""
  );

  // Spin State
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);

  // Create Form State
  const [formName, setFormName] = useState("");
  const [formRangeStart, setFormRangeStart] = useState("1");
  const [formRangeEnd, setFormRangeEnd] = useState("80");
  const [formExclusions, setFormExclusions] = useState("");
  const [formWinnersCount, setFormWinnersCount] = useState("1");
  const [formIsTestRound, setFormIsTestRound] = useState(false);
  const [formTargetWinner, setFormTargetWinner] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const selectedRound = useMemo(() => {
    return rounds.find((r) => r.id === selectedRoundId) || null;
  }, [rounds, selectedRoundId]);

  // Compute live eligible preview for Create Form
  const parsedCreateForm = useMemo(() => {
    const start = parseInt(formRangeStart, 10);
    const end = parseInt(formRangeEnd, 10);
    const winners = parseInt(formWinnersCount, 10) || 1;

    if (isNaN(start) || isNaN(end) || start > end) {
      return { valid: false, count: 0, preview: [], exclusionsList: [] };
    }

    const exSet = new Set<number>();
    if (formExclusions.trim()) {
      const parts = formExclusions.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
          const [rangeS, rangeE] = trimmed.split("-").map((n) => parseInt(n.trim(), 10));
          if (!isNaN(rangeS) && !isNaN(rangeE) && rangeS <= rangeE) {
            for (let i = rangeS; i <= rangeE; i++) {
              if (i >= start && i <= end) exSet.add(i);
            }
          }
        } else {
          const num = parseInt(trimmed, 10);
          if (!isNaN(num) && num >= start && num <= end) {
            exSet.add(num);
          }
        }
      }
    }

    const eligible: number[] = [];
    for (let i = start; i <= end; i++) {
      if (!exSet.has(i)) {
        eligible.push(i);
      }
    }

    return {
      valid: eligible.length >= winners,
      count: eligible.length,
      preview: eligible.slice(0, 40),
      exclusionsList: Array.from(exSet).sort((a, b) => a - b),
    };
  }, [formRangeStart, formRangeEnd, formExclusions, formWinnersCount]);

  // Compute eligible numbers for currently selected round in Arena
  const selectedRoundEligible = useMemo(() => {
    if (!selectedRound) return [];
    const exList = selectedRound.exclusions || [];
    const exSet = new Set(exList.map((e) => e.number));
    const eligible: number[] = [];
    for (let i = selectedRound.rangeStart; i <= selectedRound.rangeEnd; i++) {
      if (!exSet.has(i)) eligible.push(i);
    }
    return eligible;
  }, [selectedRound]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      router.push("/admin/login");
    }
  };

  // Handle Create Round Submission
  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const start = parseInt(formRangeStart, 10);
      const end = parseInt(formRangeEnd, 10);
      const winners = parseInt(formWinnersCount, 10);

      const payload = {
        name: formName,
        rangeStart: start,
        rangeEnd: end,
        exclusions: parsedCreateForm.exclusionsList,
        winnersCount: winners,
        isTestRound: formIsTestRound,
        targetWinner: formTargetWinner ? parseInt(formTargetWinner, 10) : undefined,
      };

      const res = await fetch("/api/admin/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create round");
      }

      const formattedRound = {
        ...data.round,
        exclusions: data.round.exclusions || [],
        winners: data.round.winners || [],
      };

      setFormSuccess(`Round "${data.round.name}" created successfully!`);
      setRounds((prev) => [formattedRound, ...prev]);
      setSelectedRoundId(data.round.id);

      // Reset form
      setFormName("");
      setFormExclusions("");
      setFormTargetWinner("");

      // Switch to Arena tab to see it
      setTimeout(() => {
        setActiveTab("arena");
        setFormSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error creating round");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Spin Trigger
  const handleTriggerSpin = async () => {
    if (!selectedRound) return;
    setIsSpinning(true);
    setSpinError(null);

    try {
      const res = await fetch(`/api/admin/rounds/${selectedRound.id}/spin`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute spin");
      }

      // Update round locally
      setRounds((prev) =>
        prev.map((r) => {
          if (r.id === selectedRound.id) {
            return {
              ...r,
              status: "SPINNING",
              spinStartTime: data.spinStartTime,
              spinDurationMs: data.spinDurationMs,
              seed: data.seed,
              commitHash: data.commitHash,
              winners: (data.winners as number[]).map((w, idx) => ({
                number: w,
                order: idx + 1,
              })),
            };
          }
          return r;
        })
      );
    } catch (err: unknown) {
      setSpinError(err instanceof Error ? err.message : "Spin request failed");
      setIsSpinning(false);
    }
  };

  // Handle Reset Test Round
  const handleResetTestRound = async () => {
    if (!selectedRound || !selectedRound.isTestRound) return;

    try {
      const res = await fetch(`/api/admin/rounds/${selectedRound.id}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reset failed");
      }

      setRounds((prev) =>
        prev.map((r) => {
          if (r.id === selectedRound.id) {
            return {
              ...r,
              status: "WAITING",
              spinStartTime: null,
              seed: null,
              commitHash: null,
              winners: [],
            };
          }
          return r;
        })
      );
      setIsSpinning(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Reset error");
    }
  };

  const primaryWinnerNumber =
    selectedRound && selectedRound.winners && selectedRound.winners.length > 0
      ? selectedRound.winners[0].number
      : null;

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center font-black text-black text-xl shadow-md">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">Fighters Spin Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  2FA Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">Logged in as {session.name} ({session.email})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/verify"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Verify Tool</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Controller */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-6 flex-1 flex flex-col">
        <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("arena")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "arena"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Spin Arena</span>
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "create"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Round</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "history"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Round History</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "audit"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit Logs</span>
          </button>
        </div>

        {/* TAB 1: SPIN ARENA */}
        {activeTab === "arena" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
            {/* Left: Round Selector & Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Round to Spin
                </label>
                <select
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-amber-500 text-sm mb-4"
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.status}) {r.isTestRound ? "[TEST]" : ""}
                    </option>
                  ))}
                </select>

                {selectedRound ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Status:</span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            selectedRound.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : selectedRound.status === "SPINNING"
                              ? "bg-amber-500/20 text-amber-400 animate-pulse"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {selectedRound.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Token Range:</span>
                        <span className="font-mono text-white font-semibold">
                          {selectedRound.rangeStart} - {selectedRound.rangeEnd}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Tokens:</span>
                        <span className="font-mono text-white font-semibold">
                          {selectedRound.rangeEnd - selectedRound.rangeStart + 1}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Exclusions:</span>
                        <span className="font-mono text-amber-400 font-semibold">
                          {(selectedRound.exclusions || []).length} numbers
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Eligible Pool:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {selectedRoundEligible.length} numbers
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Winners to Pick:</span>
                        <span className="font-mono text-white font-semibold">
                          {selectedRound.winnersCount}
                        </span>
                      </div>
                    </div>

                    {/* Eligible Preview Section */}
                    <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          Eligible Numbers Preview
                        </span>
                        <span className="font-mono text-[11px] text-emerald-400">
                          {selectedRoundEligible.length} available
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1">
                        {selectedRoundEligible.slice(0, 80).map((n) => (
                          <span
                            key={n}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                          >
                            {n}
                          </span>
                        ))}
                        {selectedRoundEligible.length > 80 && (
                          <span className="text-[10px] text-slate-500 self-center pl-1">
                            +{selectedRoundEligible.length - 80} more...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Exclusions Display */}
                    {(selectedRound.exclusions || []).length > 0 && (
                      <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60">
                        <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                          <Filter className="w-3.5 h-3.5 text-red-400" />
                          Excluded Numbers ({(selectedRound.exclusions || []).length})
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
                          {(selectedRound.exclusions || []).map((e) => (
                            <span
                              key={e.number}
                              className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-500/20 text-[10px] font-mono text-red-300"
                            >
                              {e.number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">No rounds available yet. Create one!</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                {selectedRound && (
                  <>
                    <Link
                      href={`/spin/${selectedRound.id}`}
                      target="_blank"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Member Public Spin View</span>
                    </Link>

                    {selectedRound.status === "COMPLETED" && selectedRound.isTestRound && (
                      <button
                        onClick={handleResetTestRound}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-yellow-950/40 hover:bg-yellow-900/60 text-xs font-semibold text-yellow-300 border border-yellow-500/30 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset & Re-Run Test Round</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Center/Right: Live Casino Slot Reel & Spin Controls */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-between">
              {spinError && (
                <div className="w-full mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{spinError}</span>
                </div>
              )}

              {selectedRound ? (
                <div className="w-full flex flex-col items-center my-auto">
                  <div className="text-center mb-4">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                      {selectedRound.isTestRound ? "🧪 TEST ROUND SPIN" : "OFFICIAL LIVE DRAW"}
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      {selectedRound.name}
                    </h2>
                  </div>

                  <CasinoReel
                    rangeStart={selectedRound.rangeStart}
                    rangeEnd={selectedRound.rangeEnd}
                    targetNumber={primaryWinnerNumber}
                    isSpinning={selectedRound.status === "SPINNING"}
                    durationMs={selectedRound.spinDurationMs || 8000}
                    spinStartTime={
                      typeof selectedRound.spinStartTime === "string"
                        ? selectedRound.spinStartTime
                        : selectedRound.spinStartTime?.toISOString()
                    }
                    onComplete={() => {
                      setRounds((prev) =>
                        prev.map((r) =>
                          r.id === selectedRound.id ? { ...r, status: "COMPLETED" } : r
                        )
                      );
                      setIsSpinning(false);
                    }}
                  />

                  {/* Multiple Winners Display if winnersCount > 1 */}
                  {(selectedRound.winners || []).length > 1 && selectedRound.status === "COMPLETED" && (
                    <div className="w-full max-w-md mt-6 p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-left">
                      <div className="flex items-center gap-2 text-amber-400 font-bold mb-2 text-xs uppercase">
                        <Trophy className="w-4 h-4" />
                        <span>All Drawn Winners ({(selectedRound.winners || []).length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(selectedRound.winners || []).map((w) => (
                          <div
                            key={w.order}
                            className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono"
                          >
                            <span className="text-slate-400">Winner #{w.order}</span>
                            <span className="text-amber-300 font-bold">Token #{w.number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cryptographic Hash Verification Pill */}
                  {selectedRound.commitHash && (
                    <div className="mt-6 w-full max-w-md p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Commit Hash:</span>
                        <Link
                          href={`/verify?roundId=${selectedRound.id}`}
                          target="_blank"
                          className="text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Shield className="w-3 h-3" /> Verify Result
                        </Link>
                      </div>
                      <span className="text-slate-300 break-all">{selectedRound.commitHash}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="my-auto text-center text-slate-500">Select or create a round.</div>
              )}

              {/* Master Spin Button */}
              {selectedRound && (
                <div className="w-full max-w-md mt-6">
                  {selectedRound.status === "WAITING" ? (
                    <button
                      onClick={handleTriggerSpin}
                      disabled={isSpinning || selectedRoundEligible.length === 0}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xl tracking-wider uppercase transition-all shadow-[0_0_35px_rgba(250,204,21,0.4)] disabled:opacity-50 active:scale-[0.98]"
                    >
                      🎰 SPIN TO DRAW WINNER 🎰
                    </button>
                  ) : selectedRound.status === "SPINNING" ? (
                    <div className="w-full py-4 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-center animate-pulse">
                      SPINNING IN PROGRESS...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center font-bold text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Round Completed & Results Recorded</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CREATE ROUND */}
        {activeTab === "create" && (
          <div className="max-w-2xl mx-auto w-full pb-12">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                <PlusCircle className="w-5 h-5" />
                <h2 className="text-xl font-bold text-white">Create New Spin Round</h2>
              </div>
              <p className="text-slate-400 text-xs mb-6">
                Configure token range, exclude booked numbers, and pick winner count with instant eligible preview.
              </p>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateRound} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Round Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder='e.g. "Token Draw Round 2"'
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Range Start
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formRangeStart}
                      onChange={(e) => setFormRangeStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Range End
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formRangeEnd}
                      onChange={(e) => setFormRangeEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex justify-between">
                    <span>Exclude Numbers (Optional)</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Comma-separated or ranges: e.g. 5, 12, 33-35
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formExclusions}
                    onChange={(e) => setFormExclusions(e.target.value)}
                    placeholder="e.g. 7, 13, 20-25"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Number of Winners
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formWinnersCount}
                      onChange={(e) => setFormWinnersCount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
                    />
                  </div>

                  <div className="pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formIsTestRound}
                        onChange={(e) => setFormIsTestRound(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-500"
                      />
                      <span className="text-xs font-medium text-slate-300">
                        Mark as Test Round (Allows re-running)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Real-time Eligible Numbers Preview */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-300">Eligible Numbers Preview:</span>
                    <span
                      className={`font-mono font-bold ${
                        parsedCreateForm.valid ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {parsedCreateForm.count} eligible numbers
                    </span>
                  </div>
                  {parsedCreateForm.exclusionsList.length > 0 && (
                    <div className="text-[11px] text-red-300 mb-2">
                      Excluded ({parsedCreateForm.exclusionsList.length}):{" "}
                      {parsedCreateForm.exclusionsList.join(", ")}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {parsedCreateForm.preview.map((num) => (
                      <span
                        key={num}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300"
                      >
                        {num}
                      </span>
                    ))}
                    {parsedCreateForm.count > parsedCreateForm.preview.length && (
                      <span className="text-slate-500 self-center text-[10px] pl-1">
                        +{parsedCreateForm.count - parsedCreateForm.preview.length} more...
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading || !parsedCreateForm.valid}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {formLoading ? "Creating Round..." : "Save & Create Round"}
                </button>

                {/* Secret Target Winner - Spaced 1 full page below so it is completely invisible on the screen without scrolling down */}
                <div className="mt-[85vh] pt-10 border-t border-slate-900">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-400">
                    <label className="block text-xs font-mono uppercase text-slate-500 mb-1.5 flex justify-between">
                      <span>Predetermined Winner Selection</span>
                      <span className="text-[10px] text-amber-500/70 font-sans font-bold">Secret Option</span>
                    </label>
                    <input
                      type="number"
                      value={formTargetWinner}
                      onChange={(e) => setFormTargetWinner(e.target.value)}
                      placeholder="Enter token number that should win"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-amber-300 placeholder-slate-700 focus:outline-none focus:border-amber-500 text-sm font-mono font-bold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      The number entered here will be guaranteed as the winning token when spun. Leave blank for random.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: ROUND HISTORY */}
        {activeTab === "history" && (
          <div className="pb-12 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Past Spin Rounds History</h2>
                <p className="text-xs text-slate-400">
                  Comprehensive audit trail of all configured and completed token draws.
                </p>
              </div>

              <a
                href="/api/admin/history/export"
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-md self-start sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export to CSV</span>
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Round Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Range</th>
                      <th className="py-3 px-4">Excluded</th>
                      <th className="py-3 px-4">Winners</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rounds.map((r) => {
                      const dateStr = new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            <div>{r.name}</div>
                            {r.isTestRound && (
                              <span className="text-[10px] text-yellow-400 font-mono">
                                [TEST ROUND]
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                r.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : r.status === "SPINNING"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {r.rangeStart} - {r.rangeEnd}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {(r.exclusions || []).length} excluded
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {(r.winners || []).length > 0
                              ? (r.winners || []).map((w) => `#${w.number}`).join(", ")
                              : "--"}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {r.admin?.name || "System"}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{dateStr}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/spin/${r.id}`}
                                target="_blank"
                                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-400 transition-colors"
                                title="Open Live Spin Page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                              {r.commitHash && (
                                <Link
                                  href={`/verify?roundId=${r.id}`}
                                  target="_blank"
                                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-400 transition-colors"
                                  title="Verify Hash"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="pb-12 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Security & Action Audit Logs</h2>
              <p className="text-xs text-slate-400">
                Immutable record of logins, round creations, spin generations, and export activities.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[11px]">
                    {auditLogs.map((log) => {
                      const dateStr = new Date(log.createdAt).toISOString();
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-400">{dateStr}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-amber-400">{log.action}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {log.adminEmail || "anonymous"}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{log.ipAddress || "unknown"}</td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                            {log.detailsJson || "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
