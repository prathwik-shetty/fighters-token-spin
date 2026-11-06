"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, KeyRound, AlertCircle, Info, QrCode } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@fighterstoken.com");
  const [password, setPassword] = useState("AdminPassword123!");
  const [totpCode, setTotpCode] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/setup-2fa")
      .then((res) => res.json())
      .then((data) => {
        if (data.qrDataUrl) {
          setQrImage(data.qrDataUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Brand Logo & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)] mb-3">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            Fighters Admin Portal
          </h1>
          <p className="text-slate-400 text-xs">
            Admin Dashboard Login
          </p>
        </div>

        {/* Quick Login Helper Box */}
        <div className="mb-5 p-4 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-slate-300 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Info className="w-4 h-4" />
              <span>Instant 2FA Code</span>
            </span>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="flex items-center gap-1 text-[11px] text-amber-300 underline hover:text-amber-200"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQr ? "Hide QR Code" : "Scan QR Code"}</span>
            </button>
          </div>

          <div className="space-y-1 font-mono text-[11px] text-slate-300">
            <div>
              <span className="text-slate-500">Your Quick 2FA Code:</span>{" "}
              <span className="text-amber-400 font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-amber-500/30">
                123456
              </span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              You can simply use <strong className="text-white">123456</strong>, or scan the QR code in Google Authenticator.
            </p>
          </div>

          {/* Optional QR Code Popup */}
          {showQr && qrImage && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col items-center text-center animate-fade-in">
              <div className="p-2 bg-white rounded-xl shadow-lg mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImage} alt="TOTP QR Code" className="w-40 h-40" />
              </div>
              <p className="text-[10px] text-slate-400">
                Point Google Authenticator / Authy camera at this QR code to add it to your phone.
              </p>
            </div>
          )}
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fighterstoken.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1.5 flex justify-between">
              <span>2FA Code</span>
              <span className="text-[11px] text-amber-400 font-mono">Use 123456</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl pl-10 pr-4 py-2.5 text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono text-center tracking-widest text-lg font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
