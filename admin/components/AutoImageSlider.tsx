import React, { useState, useEffect } from 'react';

export interface AutoImageSliderProps {
  images: string[];
  altTitle: string;
}

export const AutoImageSlider: React.FC<AutoImageSliderProps> = ({ images, altTitle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!images || images.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3500); // Har 3.5 soniyada avto-slayd

    return () => clearInterval(interval);
  }, [images, isHovered]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-44 bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs rounded-t-2xl border-b border-slate-100">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-1 text-slate-400">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>Rasm yuklanmagan</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-44 overflow-hidden rounded-t-2xl group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={images[currentIndex]}
        alt={`${altTitle} - ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-all duration-700 ease-in-out"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop';
        }}
      />
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/50'
              }`}
              aria-label={`Rasm ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
