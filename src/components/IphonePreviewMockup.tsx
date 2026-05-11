'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Battery, 
  Signal, 
  Flashlight, 
  Camera, 
  Lock, 
} from 'lucide-react';
import { motion } from 'framer-motion';
import ImageWithLqip from './ImageWithLqip';

interface IphonePreviewMockupProps {
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

export default function IphonePreviewMockup({ imageUrl, imageAlt, onClose }: IphonePreviewMockupProps) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    let minutes = date.getMinutes().toString().padStart(2, '0');
    hours = hours % 12 || 12;
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      {/* IPHONE MOCKUP */}
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative scale-[0.85] sm:scale-100 origin-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the phone itself
      >
        {/* Hardware Buttons */}
        <div className="absolute top-[120px] -left-[2px] w-[3px] h-[26px] bg-neutral-700/80 rounded-l-md border border-neutral-600/50 shadow-sm z-0"></div>
        <div className="absolute top-[170px] -left-[2px] w-[3px] h-[55px] bg-neutral-700/80 rounded-l-md border border-neutral-600/50 shadow-sm z-0"></div>
        <div className="absolute top-[240px] -left-[2px] w-[3px] h-[55px] bg-neutral-700/80 rounded-l-md border border-neutral-600/50 shadow-sm z-0"></div>
        <div className="absolute top-[190px] -right-[2px] w-[3px] h-[85px] bg-neutral-700/80 rounded-r-md border border-neutral-600/50 shadow-sm z-0"></div>

        {/* Main Device Chassis */}
        <div className="relative w-[340px] h-[736px] bg-black rounded-[55px] shadow-2xl border-[12px] border-black ring-1 ring-neutral-800 overflow-hidden z-10">
          
          {/* Display / Screen */}
          <div className="relative w-full h-full bg-neutral-900 overflow-hidden rounded-[43px]">
            
            {/* Wallpaper Image */}
            <div className="absolute inset-0 w-full h-full">
              <ImageWithLqip
                src={imageUrl}
                alt={imageAlt}
                fill
                className="object-cover"
                sizes="340px"
                priority
                transformOpts={{ w: 1080, h: 2340, fit: 'cover', q: 'auto:best' }}
                noBlur={true}
              />
            </div>
            
            {/* Overlay shadow to make white text readable */}
            <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>

            {/* Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[115px] h-[34px] bg-black rounded-full z-50 flex items-center justify-between px-2.5 shadow-md">
              <div className="w-[10px] h-[10px] rounded-full bg-neutral-900/50"></div>
              <div className="w-[12px] h-[12px] rounded-full bg-neutral-800 border-[1.5px] border-neutral-700/60 shadow-inner flex items-center justify-center">
                <div className="w-[4px] h-[4px] rounded-full bg-blue-900/30"></div>
              </div>
            </div>

            {/* LOCK SCREEN VIEW */}
            <div className="absolute inset-0 opacity-100 pointer-events-none">
              {/* Top Status Bar */}
              <div className="absolute top-4 right-5 flex items-center gap-1.5 text-white z-40 drop-shadow-md">
                <Signal size={14} className="fill-current" strokeWidth={2.5}/>
                <Wifi size={14} className="fill-current" strokeWidth={2.5}/>
                <Battery size={16} className="fill-current" strokeWidth={2}/>
              </div>

              {/* Lock Icon */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-white drop-shadow-md">
                <Lock size={20} className="fill-current" />
              </div>

              {/* Date and Time */}
              <div className="absolute top-24 w-full flex flex-col items-center text-white drop-shadow-lg">
                <span className="text-[21px] font-medium tracking-wide mb-[-5px]">
                  {time ? formatDate(time) : ''}
                </span>
                <span className="text-[85px] font-semibold tracking-tighter leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {time ? formatTime(time) : ''}
                </span>
              </div>

              {/* Bottom Action Buttons */}
              <div className="absolute bottom-12 w-full px-12 flex justify-between pointer-events-auto">
                <button className="w-12 h-12 rounded-full bg-neutral-900/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 active:bg-white active:text-black transition-colors cursor-pointer">
                  <Flashlight size={22} />
                </button>
                <button className="w-12 h-12 rounded-full bg-neutral-900/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 active:bg-white active:text-black transition-colors cursor-pointer">
                  <Camera size={22} />
                </button>
              </div>
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-white/90 rounded-full z-50 drop-shadow-sm"></div>
          </div>
        </div>
        
        {/* Close hint */}
        <p className="absolute -bottom-10 left-0 right-0 text-center text-white/70 text-sm font-medium tracking-wide">Click anywhere to close</p>
      </motion.div>
    </motion.div>
  );
}
