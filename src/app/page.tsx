import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, Play, KeyRound, Sparkles, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rounds = await prisma.round.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      exclusions: true,
      winners: { orderBy: { order: "asc" } },
    },
  });

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Navigation */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center font-black text-black text-xl shadow-[0_0_15px_rgba(234,179,8,0.4)]">
              F
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">Fighters Token Spin</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                CSPRNG VERIFIED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verify Fairness</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition-all shadow-md shadow-amber-500/20"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Provably Fair Token Drawing Arena</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-500 tracking-tight max-w-4xl mb-6">
          Next-Gen Casino Token Spin
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10">
          Real-time synchronized public spin rooms powered by cryptographic CSPRNG,
          SHA-256 pre-commitments, and casino audio-visual reels.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-14 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 font-black">
              🔒
            </div>
            <h3 className="font-bold text-white text-base mb-1">CSPRNG & Commit Hashes</h3>
            <p className="text-xs text-slate-400">
              Numbers are drawn server-side using Node.js crypto.randomInt and locked with SHA-256 hashes before animation begins.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 font-black">
              ⚡
            </div>
            <h3 className="font-bold text-white text-base mb-1">Live Synchronized SSE</h3>
            <p className="text-xs text-slate-400">
              All member devices experience identical spin countdowns and landings simultaneously via Server-Sent Events.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 font-black">
              🛡️
            </div>
            <h3 className="font-bold text-white text-base mb-1">2FA Protected Admin</h3>
            <p className="text-xs text-slate-400">
              Complete administrative dashboard with TOTP 2FA, exclusion filtering, multi-winner draws, and CSV exports.
            </p>
          </div>
        </div>

        {/* Available Live Rounds Arena List */}
        <div className="w-full max-w-4xl text-left">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>Available Spin Rounds</span>
            </h2>
            <Link
              href="/admin"
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              Manage in Admin &rarr;
            </Link>
          </div>

          {rounds.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-sm">
              No rounds created yet. Please log into the{" "}
              <Link href="/admin" className="text-amber-400 underline">
                Admin Dashboard
              </Link>{" "}
              to create the first spin round!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rounds.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : r.status === "SPINNING"
                            ? "bg-amber-500/20 text-amber-400 animate-pulse"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.isTestRound && (
                        <span className="text-[10px] font-mono text-yellow-400">TEST</span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-lg group-hover:text-amber-300 transition-colors">
                      {r.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Range: {r.rangeStart} - {r.rangeEnd} • Excluded: {r.exclusions.length}
                    </p>
                    {r.winners.length > 0 && (
                      <div className="mt-3 text-xs font-mono text-amber-400 font-bold">
                        Winner(s): {r.winners.map((w) => `#${w.number}`).join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <Link
                      href={`/spin/${r.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Watch Live Spin</span>
                    </Link>

                    {r.commitHash && (
                      <Link
                        href={`/verify?roundId=${r.id}`}
                        className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors font-mono"
                      >
                        Verify Hash
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© Fighters Token Spin. Provably Fair CSPRNG System.</p>
          <div className="flex gap-4">
            <Link href="/verify" className="hover:text-slate-300">
              Verify
            </Link>
            <Link href="/admin" className="hover:text-slate-300">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
