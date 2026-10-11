'use client';

import React from 'react';

interface IraqiPlateBadgeProps {
  plateNumber: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Renders an authentic Iraqi Unified License Plate (اللوحة المرورية العراقية الموحدة)
 * matching the official white border, left "I R Q" vertical bar, governorate code/letter, and main digits.
 */
export default function IraqiPlateBadge({ plateNumber, size = 'md' }: IraqiPlateBadgeProps) {
  if (!plateNumber) return <span className="text-slate-400">—</span>;

  // Attempt to parse plate into top part (e.g. "14 G" or governorate) and bottom main digits (e.g. "34567")
  const tokens = plateNumber.trim().split(/[\s-]+/);
  let topPart = '14 A';
  let bottomDigits = plateNumber.trim();

  if (tokens.length >= 2) {
    // Find longest numeric sequence as the main plate number
    const numIdx = tokens.findIndex((t) => /^\d{3,6}$/.test(t));
    if (numIdx !== -1) {
      bottomDigits = tokens[numIdx];
      const others = tokens.filter((_, idx) => idx !== numIdx).join(' ');
      topPart = others || '14 A';
    } else {
      topPart = tokens.slice(0, -1).join(' ');
      bottomDigits = tokens[tokens.length - 1];
    }
  }

  const sizeStyles = {
    sm: {
      container: 'h-11 min-w-[115px] text-xs border-2 rounded-lg',
      irqCol: 'w-5 text-[8px] leading-[9px]',
      topText: 'text-[11px]',
      bottomText: 'text-sm tracking-widest'
    },
    md: {
      container: 'h-14 min-w-[145px] text-sm border-[2.5px] rounded-xl',
      irqCol: 'w-6 text-[9px] leading-[10px]',
      topText: 'text-xs',
      bottomText: 'text-lg tracking-widest'
    },
    lg: {
      container: 'h-16 min-w-[175px] text-base border-[3px] rounded-xl',
      irqCol: 'w-7 text-[10px] leading-[11px]',
      topText: 'text-sm',
      bottomText: 'text-xl tracking-widest'
    }
  }[size];

  return (
    <div
      dir="ltr"
      className={`inline-flex items-stretch bg-white border-slate-900 text-slate-950 font-mono font-black shadow-sm overflow-hidden select-none ${sizeStyles.container}`}
    >
      {/* Left Vertical Bar: I R Q + hologram square */}
      <div
        className={`flex flex-col items-center justify-between py-1 border-r-2 border-slate-900 bg-slate-50 font-black ${sizeStyles.irqCol}`}
      >
        <span>I</span>
        <span>R</span>
        <span>Q</span>
        <span className="w-2.5 h-2 rounded-[2px] bg-gradient-to-tr from-slate-400 via-amber-300 to-emerald-300 border border-slate-400 mt-0.5"></span>
      </div>

      {/* Right Main Plate Area: Top Governorate/Letter + Bottom Digits */}
      <div className="flex-1 flex flex-col justify-center items-center px-2.5 py-0.5 leading-none">
        <div className={`w-full flex justify-between items-center font-black uppercase text-slate-800 ${sizeStyles.topText}`}>
          <span>{topPart}</span>
        </div>
        <div className={`w-full text-center font-black text-slate-950 mt-0.5 ${sizeStyles.bottomText}`}>
          {bottomDigits}
        </div>
      </div>
    </div>
  );
}
