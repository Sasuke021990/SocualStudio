"use client";

import React from "react";

interface MobileDeviceFrameProps {
  children: React.ReactNode;
  viewToggle?: React.ReactNode;
  className?: string;
}

export function MobileDeviceFrame({ children, viewToggle, className = "" }: MobileDeviceFrameProps) {
  return (
    <div className={`relative mx-auto flex flex-col items-center justify-center ${className}`}>
      {/* Smartphone Outer Chassis */}
      <div
        className="relative mx-auto flex max-h-[min(680px,76vh)] aspect-[9/16] w-auto flex-col overflow-hidden rounded-[44px] border-[3.5px] border-[#2c2c32] bg-[#121214] p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-black"
        style={{
          boxShadow:
            "0 20px 50px -10px rgba(0,0,0,0.85), inset 0 0 4px rgba(255,255,255,0.15), 0 0 0 1px rgba(0,0,0,0.9)",
        }}
      >
        {/* Inner Screen Display */}
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-black">
          {/* Top Status Bar & Dynamic Island */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-6 pt-2 text-[11px] font-semibold text-white">
            <span>9:41</span>
            {/* Dynamic Island Pill */}
            <div className="h-4.5 w-24 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-end px-2">
              <div className="h-2 w-2 rounded-full bg-[#1a1a24] ring-1 ring-blue-500/20" />
            </div>
            {/* Battery & Signal Icons */}
            <div className="flex items-center gap-1.5">
              <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                <rect x="0" y="7" width="2" height="3" rx="0.5" />
                <rect x="3" y="5" width="2" height="5" rx="0.5" />
                <rect x="6" y="3" width="2" height="7" rx="0.5" />
                <rect x="9" y="0" width="2" height="10" rx="0.5" />
              </svg>
              <div className="flex items-center">
                <div className="h-3 w-5 rounded-[3px] border border-white/80 p-[1px]">
                  <div className="h-full w-4/5 rounded-[1px] bg-white" />
                </div>
                <div className="h-1.5 w-0.5 rounded-r-[1px] bg-white/80" />
              </div>
            </div>
          </div>

          {/* Optional View Switcher (Image / Reel) */}
          {viewToggle && (
            <div className="absolute left-3 top-9 z-30">
              {viewToggle}
            </div>
          )}

          {/* Screen Content Viewport */}
          <div className="relative h-full w-full overflow-hidden">
            {children}
          </div>

          {/* Bottom Home Indicator Bar */}
          <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-40 -translate-x-1/2">
            <div className="h-1 w-28 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

