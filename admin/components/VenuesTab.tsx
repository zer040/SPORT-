import React, { useState, useEffect } from 'react';
import { AutoImageSlider } from './AutoImageSlider';

export interface AdminVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  avg_rating: number;
  total_bookings: number;
  images: string[];
  owner_name?: string;
  pitches?: Array<{ id: string; name: string; format: string }>;
}

export const VenuesTab: React.FC<{ onAddVenueClick?: () => void }> = ({ onAddVenueClick }) => {
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/venues');
      if (res.ok) {
        const data = await res.json();
        setVenues(data || []);
      }
    } catch (err) {
      console.error('Stadionlarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Stadionlar & Maydonlar</h2>
        <button
          onClick={onAddVenueClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Yangi Stadion Qo'shish</span>
        </button>
      </div>

      {/* Stadionlar Ro'yxati */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-medium">Stadionlar yuklanmoqda...</div>
      ) : venues.length === 0 ? (
        /* Toza shaffof minimal bo'sh holat (Empty State) */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-white/70 backdrop-blur-md border border-dashed border-slate-300 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Hech qanday stadion mavjud emas</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6">
            Hech qanday stadion mavjud emas. Yangi stadion qo'shish tugmasi orqali ilk stadionni yarating.
          </p>
          <button
            onClick={onAddVenueClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Yangi Stadion Qo'shish</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => (
            <div
              key={v.id}
              className="flex flex-col rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              {/* Avtomatik va silliq siljiydigan AutoImageSlider */}
              <AutoImageSlider images={v.images || []} altTitle={v.name} />

              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-lg">{v.name}</h3>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    <span>★</span>
                    <span>{v.avg_rating || '5.0'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{v.city}, {v.address}</span>
                </div>

                {v.pitches && v.pitches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {v.pitches.map((p) => (
                      <span key={p.id} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        {p.name} ({p.format})
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Maydon Egasi:</span>
                  <span className="font-semibold text-slate-800">{v.owner_name || 'Biriktirilmagan'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
