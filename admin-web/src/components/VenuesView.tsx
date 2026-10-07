import React, { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, User, Trash2, Image, X } from 'lucide-react';
import { AdminApi, AdminVenue } from '../services/adminApi';

interface VenuesViewProps {
  venues: AdminVenue[];
  onRefresh: () => void;
}

export const VenuesView: React.FC<VenuesViewProps> = ({ venues, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [owners, setOwners] = useState<
    { id: string; full_name: string; phone_number?: string; role: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Toshkent');
  const [district, setDistrict] = useState('Chilonzor');
  const [lat, setLat] = useState('41.2858');
  const [lng, setLng] = useState('69.2163');
  const [format, setFormat] = useState('7x7');
  const [pricePerHour, setPricePerHour] = useState('140000');
  const [ownerId, setOwnerId] = useState('');

  // Facilities
  const [facilityShower, setFacilityShower] = useState(true);
  const [facilityLighting, setFacilityLighting] = useState(true);
  const [facilityParking, setFacilityParking] = useState(true);
  const [facilityChangingRoom, setFacilityChangingRoom] = useState(true);

  // Multi-image URLs (kamida 3 ta)
  const [imageUrl1, setImageUrl1] = useState(
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'
  );
  const [imageUrl2, setImageUrl2] = useState(
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80'
  );
  const [imageUrl3, setImageUrl3] = useState(
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80'
  );

  useEffect(() => {
    AdminApi.getOwners().then((list) => {
      setOwners(list);
      if (list.length > 0) setOwnerId(list[0].id);
    });
  }, []);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setErrorMsg('Please enter venue name and address');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const images = [imageUrl1, imageUrl2, imageUrl3].filter((u) => u.trim().length > 0);

    try {
      await AdminApi.createVenue({
        name: name.trim(),
        description: description.trim() || `${name} modern sports venue`,
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        lat: parseFloat(lat) || 41.2858,
        lng: parseFloat(lng) || 69.2163,
        owner_id: ownerId || undefined,
        format,
        price_per_hour: parseFloat(pricePerHour) || 120000,
        facilities: {
          shower: facilityShower,
          lighting: facilityLighting,
          parking: facilityParking,
          changing_room: facilityChangingRoom,
        },
        images,
      });

      setModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create venue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      await AdminApi.deleteVenue(venueId);
      onRefresh();
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md shadow-slate-900/10 transition-all active:scale-95"
        >
          <Plus size={16} className="text-emerald-400" />
          <span>+ New Venue</span>
        </button>
      </div>

      {/* Venues Grid */}
      {(() => {
        const safeVenues = Array.isArray(venues) ? venues : [];
        if (safeVenues.length === 0) {
          return (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Building2 size={28} />
              </div>
              <h4 className="text-base font-extrabold text-slate-800">No venues yet</h4>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>+ New Venue</span>
              </button>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeVenues.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Image Slider / Cover */}
                <div className="h-44 bg-slate-100 relative overflow-hidden group">
                  {v.primary_image_url ? (
                    <img
                      src={v.primary_image_url}
                      alt={v.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Image size={40} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-950/80 text-emerald-400 backdrop-blur-md border border-slate-700">
                      {v.pitches_count} pitches
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold backdrop-blur-md ${
                        v.is_active
                          ? 'bg-emerald-500/90 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {v.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                      {v.name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{v.address}</span>
                    </p>
                  </div>

                  {/* Owner Info & Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <User size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {v.owner_name || 'No owner assigned'}
                        </p>
                        <p className="text-[10px] text-slate-400">{v.owner_phone || '+998...'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteVenue(v.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete venue"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Modal: New Venue */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">New Venue</h3>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="mt-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pakhtakor Arena"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Chilonzor"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 21 Chilanzar 9th Block"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Modern indoor turf with LED lighting"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Format, Price and Geolocation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pitch Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
                  >
                    <option value="5x5">5 x 5 (Mini)</option>
                    <option value="7x7">7 x 7 (Standard)</option>
                    <option value="11x11">11 x 11 (Full)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hourly Rate (UZS)
                  </label>
                  <input
                    type="number"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Assigned Venue Owner */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Venue Owner
                </label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  <option value="">(Admin default)</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name} ({o.role}) — {o.phone_number || 'No phone'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amenities & Facilities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Amenities & Facilities
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={facilityShower}
                      onChange={(e) => setFacilityShower(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Shower</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={facilityLighting}
                      onChange={(e) => setFacilityLighting(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Lighting</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={facilityParking}
                      onChange={(e) => setFacilityParking(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Parking</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={facilityChangingRoom}
                      onChange={(e) => setFacilityChangingRoom(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>Locker Room</span>
                  </label>
                </div>
              </div>

              {/* Multi-Image URLs (3 URLs) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Venue Photos (Image URLs)
                </label>
                <input
                  type="url"
                  value={imageUrl1}
                  onChange={(e) => setImageUrl1(e.target.value)}
                  placeholder="Photo 1 URL (Primary)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="url"
                  value={imageUrl2}
                  onChange={(e) => setImageUrl2(e.target.value)}
                  placeholder="Photo 2 URL"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="url"
                  value={imageUrl3}
                  onChange={(e) => setImageUrl3(e.target.value)}
                  placeholder="Photo 3 URL"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
