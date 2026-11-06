"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { soundManager } from "@/lib/audio";
import confetti from "canvas-confetti";
import { Volume2, VolumeX, Sparkles } from "lucide-react";

interface CasinoReelProps {
  rangeStart: number;
  rangeEnd: number;
  targetNumber: number | null;
  isSpinning: boolean;
  durationMs?: number;
  spinStartTime?: string | null;
  onComplete?: () => void;
  winnerLabel?: string;
}

const ITEM_HEIGHT = 100; // Height of each number cell in pixels
const TOTAL_STRIP_ITEMS = 60; // Length of decorative reel strip

export const CasinoReel: React.FC<CasinoReelProps> = ({
  rangeStart,
  rangeEnd,
  targetNumber,
  isSpinning,
  durationMs = 8000,
  spinStartTime,
  onComplete,
  winnerLabel,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [currentY, setCurrentY] = useState(0);
  const [hasLanded, setHasLanded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [flickerNumber, setFlickerNumber] = useState<number | null>(targetNumber);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);
  const tickIntervalRef = useRef<number>(60);
  const hasCompletedRef = useRef<boolean>(false);

  // Check initial mute state and prefers-reduced-motion
  useEffect(() => {
    setIsMuted(soundManager.getMuted());
    try {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    } catch {
      setReducedMotion(false);
    }
  }, []);

  // Build the strip of numbers for the reel
  const reelStrip = useMemo(() => {
    const list: number[] = [];
    const span = Math.max(1, rangeEnd - rangeStart + 1);

    for (let i = 0; i < TOTAL_STRIP_ITEMS - 1; i++) {
      const randNum =
        rangeStart +
        (((Math.floor(Math.sin(i * 997 + 13) * 100000) % span) + span) % span);
      list.push(randNum);
    }

    // Land exactly on targetNumber
    list.push(targetNumber ?? rangeStart);
    return list;
  }, [rangeStart, rangeEnd, targetNumber]);

  const targetIndex = TOTAL_STRIP_ITEMS - 1;
  const targetOffsetY = targetIndex * ITEM_HEIGHT;

  // Handle spin animation
  useEffect(() => {
    if (!isSpinning) {
      if (targetNumber !== null) {
        setCurrentY(targetOffsetY);
        setHasLanded(true);
        setFlickerNumber(targetNumber);
      }
      return;
    }

    setHasLanded(false);
    hasCompletedRef.current = false;
    const startTimestamp = spinStartTime ? new Date(spinStartTime).getTime() : Date.now();
    const effectiveDuration = reducedMotion ? Math.min(2000, durationMs) : durationMs;

    const animate = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - startTimestamp);
      const progress = Math.min(1, Math.max(0, elapsed / effectiveDuration));

      // Ease-out cubic easing function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      if (reducedMotion) {
        if (progress < 1) {
          const randomInRange =
            rangeStart + Math.floor(Math.random() * (rangeEnd - rangeStart + 1));
          setFlickerNumber(randomInRange);
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setFlickerNumber(targetNumber);
          setCurrentY(targetOffsetY);
          setHasLanded(true);
          try {
            soundManager.playWin();
            confetti({
              particleCount: 60,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {}
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            if (onComplete) onComplete();
          }
        }
        return;
      }

      // Normal casino reel animation
      const nextY = easeOutCubic * targetOffsetY;
      setCurrentY(nextY);

      // Play tick audio with safety
      try {
        if (now - lastTickTimeRef.current > tickIntervalRef.current) {
          const pitch = Math.max(0.6, 1.4 - easeOutCubic * 0.7);
          soundManager.playTick(pitch);
          lastTickTimeRef.current = now;
          tickIntervalRef.current = 45 + Math.pow(progress, 3) * 350;
        }
      } catch {}

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished
        setCurrentY(targetOffsetY);
        setHasLanded(true);
        try {
          soundManager.playWin();
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#FACC15", "#EAB308", "#ff2a5f", "#00f0ff", "#ffffff"],
          });
        } catch {}

        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          if (onComplete) onComplete();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isSpinning,
    targetNumber,
    durationMs,
    spinStartTime,
    targetOffsetY,
    reducedMotion,
    onComplete,
    rangeStart,
    rangeEnd,
  ]);

  const toggleSound = () => {
    try {
      const nextMuted = soundManager.toggleMute();
      setIsMuted(nextMuted);
      if (!nextMuted) {
        soundManager.playTick(1.2);
      }
    } catch {}
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Audio toggle & status indicator bar */}
      <div className="w-full max-w-md flex justify-between items-center mb-3 px-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isSpinning
                ? "bg-amber-400 animate-ping"
                : hasLanded
                ? "bg-emerald-400"
                : "bg-slate-500"
            }`}
          />
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
            {isSpinning
              ? "Spin in Progress..."
              : hasLanded
              ? "Winner Selected!"
              : "Ready to Spin"}
          </span>
        </div>

        <button
          onClick={toggleSound}
          type="button"
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-sm"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Sound Off</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-amber-300">Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* Casino Slot Machine Outer Frame */}
      <div className="relative w-full max-w-md p-1.5 rounded-3xl bg-gradient-to-b from-amber-500 via-amber-700 to-amber-950 shadow-[0_0_50px_rgba(234,179,8,0.25)] border-2 border-amber-400/60">
        {/* Decorative Casino Bezel Lights */}
        <div className="absolute top-2 left-4 right-4 flex justify-between pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] animate-pulse" />
        </div>

        {/* Inner Darkened Slot Window */}
        <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-amber-500/40 shadow-inner">
          {/* Top & Bottom Vignette / 3D Cylinder shadow gradient overlay */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black via-black/80 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none" />

          {/* Central Target Payline Window Overlay */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[100px] z-10 pointer-events-none border-y-2 border-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(250,204,21,0.3)] flex items-center justify-between px-3">
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-amber-400 drop-shadow-[0_0_6px_#facc15]" />
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-amber-400 drop-shadow-[0_0_6px_#facc15]" />
          </div>

          {/* Reel Display */}
          {reducedMotion ? (
            <div className="h-[260px] flex items-center justify-center">
              <div
                className={`text-6xl md:text-7xl font-extrabold font-mono transition-all duration-300 ${
                  hasLanded
                    ? "text-amber-400 drop-shadow-[0_0_30px_#facc15] scale-110"
                    : "text-slate-300 animate-pulse"
                }`}
              >
                {flickerNumber !== null ? `#${flickerNumber}` : "--"}
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative h-[260px] flex justify-center items-start overflow-hidden"
              style={{ perspective: "1000px" }}
            >
              <div
                className="w-full flex flex-col items-center will-change-transform"
                style={{
                  transform: `translateY(${130 - ITEM_HEIGHT / 2 - currentY}px)`,
                  transition: isSpinning ? "none" : "transform 0.4s ease-out",
                }}
              >
                {reelStrip.map((num, idx) => {
                  const isFinalTarget = idx === targetIndex;
                  const isCurrentCenter =
                    Math.abs(currentY - idx * ITEM_HEIGHT) < ITEM_HEIGHT / 2;

                  return (
                    <div
                      key={idx}
                      className="w-full flex items-center justify-center font-mono select-none"
                      style={{ height: `${ITEM_HEIGHT}px` }}
                    >
                      <div
                        className={`text-5xl md:text-6xl font-black tracking-tight transition-transform duration-100 ${
                          isFinalTarget && hasLanded
                            ? "text-amber-300 drop-shadow-[0_0_25px_rgba(250,204,21,1)] scale-125"
                            : isCurrentCenter
                            ? "text-amber-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
                            : "text-slate-600 opacity-60"
                        }`}
                      >
                        #{num}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Winner Display Badge on Landing */}
      {hasLanded && targetNumber !== null && (
        <div className="mt-6 flex flex-col items-center animate-bounce">
          <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black text-xl shadow-[0_0_35px_rgba(250,204,21,0.7)] border-2 border-white">
            <Sparkles className="w-6 h-6 text-slate-950 fill-slate-950" />
            <span>
              {winnerLabel ? `${winnerLabel}: ` : "TOKEN #"}
              {targetNumber}
            </span>
            <Sparkles className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <span className="text-xs text-amber-300/80 mt-2 font-mono uppercase tracking-wider">
            Verified by CSPRNG & Commit Hash
          </span>
        </div>
      )}
    </div>
  );
};
