"use client";

import React, { useState, useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";

export const FullscreenToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fullscreenEnabled) {
      setIsSupported(false);
      return;
    }

    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  if (!isSupported) return null;

  return (
    <>
      {isFullscreen ? (
        <button
          onClick={toggleFullscreen}
          type="button"
          title="Exit Fullscreen (or press Esc)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition-all border border-red-400 animate-pulse ${className}`}
        >
          <Minimize className="w-3.5 h-3.5" />
          <span>Exit Fullscreen</span>
        </button>
      ) : (
        <button
          onClick={toggleFullscreen}
          type="button"
          title="Hide browser link bar and enter full screen"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-md transition-all ${className}`}
        >
          <Maximize className="w-3.5 h-3.5 text-amber-400" />
          <span>Hide Link (Fullscreen)</span>
        </button>
      )}
    </>
  );
};
