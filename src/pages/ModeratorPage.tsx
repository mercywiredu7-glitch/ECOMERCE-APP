import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Category, ModeratorReview, ModeratorStatus, Place, User } from '../types';

interface ModeratorPageProps {
  categories: Category[];
  places: Place[];
  onDataChanged: () => void;
}

const IMAGE_PRESETS = [
  { label: 'Campus Library Photo', value: '/src/assets/images/ucc_sam_jonah_library_1795264649526.jpg' },
  { label: 'Lecture Complex Photo', value: '/src/assets/images/ucc_science_lecture_hall_1795264650493.jpg' },
  { label: 'Cafeteria & Dining Photo', value: '/src/assets/images/ucc_cafeteria_dining_1795264649631.jpg' },
  { label: 'Hostel & Courtyard Photo', value: '/src/assets/images/ucc_hostel_courtyard_1795264651276.jpg' },
  { label: 'UCC Campus Spine Photo', value: '/src/assets/images/ucc_campus_hero_1795264651028.jpg' },
];

export function ModeratorPage({ categories, places, onDataChanged }: ModeratorPageProps) {
  const { user, token, setSession } = useAuth();
  const [status, setStatus] = useState<ModeratorStatus | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<'places' | 'reviews'>('places');
  const [reviews, setReviews] = useState<ModeratorReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Place form state (Create / Edit)
  const [editingPlaceId, setEditingPlaceId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [campusArea, setCampusArea] = useState('New Site');
  const [locationNote, setLocationNote] = useState('');
  const [openingHours, setOpeningHours] = useState('Mon–Fri · 8:00 AM – 6:00 PM');
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[0].value);
  const [description, setDescription] = useState('');
  const [savingPlace, setSavingPlace] = useState(false);

  const isModerator = user?.role === 'moderator';

  const loadModeratorStatus = useCallback(async () => {
    try {
      const res = await apiRequest<ModeratorStatus>('/api/moderator/status', {}, token);
      setStatus(res);
    } catch {
      // Ignore transient status fetch issues
    }
  }, [token]);

  const loadModeratorReviews = useCallback(async () => {
    if (!token || !isModerator) return;
    setLoadingReviews(true);
    try {
      const res = await apiRequest<{ reviews: ModeratorReview[] }>('/api/moderator/reviews', {}, token);
      setReviews(res.reviews);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to load reviews.');
    } finally {
      setLoadingReviews(false);
    }
  }, [token, isModerator]);

  useEffect(() => {
    loadModeratorStatus();
  }, [loadModeratorStatus]);

  useEffect(() => {
    if (isModerator) {
      loadModeratorReviews();
    }
  }, [isModerator, loadModeratorReviews]);

  useEffect(() => {
    if (categories.length > 0 && !editingPlaceId) {
      setCategoryId((prev) => prev || categories[0].id);
    }
  }, [categories, editingPlaceId]);

  async function handleClaimOrVerify(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setVerifying(true);
    try {
      const endpoint = status?.needsSetup ? '/api/moderator/claim' : '/api/moderator/verify';
      const res = await apiRequest<{ user: User; token: string }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({ passcode }),
        },
        token
      );
      setSession(res.user, res.token);
      setPasscode('');
      await loadModeratorStatus();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  function resetPlaceForm() {
    setEditingPlaceId(null);
    setName('');
    setCategoryId(categories[0]?.id || 1);
    setCampusArea('New Site');
    setLocationNote('');
    setOpeningHours('Mon–Fri · 8:00 AM – 6:00 PM');
    setImageUrl(IMAGE_PRESETS[0].value);
    setDescription('');
  }

  function startEditPlace(place: Place) {
    setEditingPlaceId(place.id);
    setName(place.name);
    setCategoryId(place.category_id);
    setCampusArea(place.campus_area);
    setLocationNote(place.location_note);
    setOpeningHours(place.opening_hours);
    setImageUrl(place.image_url);
    setDescription(place.description);
    setActionMessage('');
    setActionError('');
  }

  async function handleSavePlace(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingPlace(true);
    setActionError('');
    setActionMessage('');

    try {
      if (editingPlaceId) {
        await apiRequest(
          `/api/moderator/places/${editingPlaceId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              name,
              categoryId,
              campusArea,
              locationNote,
              openingHours,
              imageUrl,
              description,
            }),
          },
          token
        );
        setActionMessage('Campus place updated successfully.');
      } else {
        await apiRequest(
          '/api/moderator/places',
          {
            method: 'POST',
            body: JSON.stringify({
              name,
              categoryId,
              campusArea,
              locationNote,
              openingHours,
              imageUrl,
              description,
            }),
          },
          token
        );
        setActionMessage('New campus place added to the directory.');
      }
      resetPlaceForm();
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save campus place.');
    } finally {
      setSavingPlace(false);
    }
  }

  async function handleDeletePlace(placeId: number) {
    if (!token) return;
    setActionError('');
    setActionMessage('');
    try {
      await apiRequest(`/api/moderator/places/${placeId}`, { method: 'DELETE' }, token);
      setActionMessage('Campus place removed.');
      if (editingPlaceId === placeId) {
        resetPlaceForm();
      }
      onDataChanged();
      loadModeratorReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete place.');
    }
  }

  async function handleDismissFlag(reviewId: number) {
    if (!token) return;
    try {
      await apiRequest(`/api/moderator/reviews/${reviewId}/dismiss-flag`, { method: 'PATCH' }, token);
      setActionMessage('Flag cleared.');
      await loadModeratorReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to clear flag.');
    }
  }

  async function handleDeleteReview(reviewId: number) {
    if (!token) return;
    try {
      await apiRequest(`/api/moderator/reviews/${reviewId}`, { method: 'DELETE' }, token);
      setActionMessage('Inappropriate review removed.');
      await loadModeratorReviews();
      onDataChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete review.');
    }
  }

  if (!isModerator) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#0B1F3A]">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                {status?.needsSetup ? 'Set Up Moderator Access' : 'Moderator Verification'}
              </h1>
              <p className="text-xs text-slate-500">UCC Campus Guide Administration</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {status?.needsSetup
              ? 'First-time setup: choose a moderator passcode (at least 6 characters) to unlock campus place management and review moderation.'
              : 'Enter the campus moderator passcode to manage listed UCC locations and moderate flagged reviews.'}
          </p>

          {authError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
              {authError}
            </div>
          )}

          <form onSubmit={handleClaimOrVerify} className="space-y-4">
            <div>
              <label htmlFor="mod-passcode" className="block text-sm font-medium text-slate-700 mb-1.5">
                {status?.needsSetup ? 'Create Moderator Passcode' : 'Moderator Passcode'}
              </label>
              <input
                id="mod-passcode"
                type="password"
                required
                minLength={status?.needsSetup ? 6 : 1}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={status?.needsSetup ? 'Minimum 6 characters' : 'Enter moderator passcode'}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E54] disabled:opacity-60 rounded-lg transition-colors"
            >
              {verifying
                ? 'Verifying...'
                : status?.needsSetup
                  ? 'Save Passcode & Open Console'
                  : 'Unlock Moderator Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const flaggedCount = reviews.filter((r) => r.is_flagged === 1).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Campus Moderator Console</h1>
          <p className="text-sm text-slate-600 mt-1">
            Add or update UCC campus places and remove inappropriate student reviews.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('places')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'places' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manage Places ({places.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'reviews' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Moderation ({flaggedCount} flagged)
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {actionError}
        </div>
      )}

      {activeTab === 'places' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Place Form */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPlaceId ? 'Edit Campus Place' : 'Add Campus Place'}
              </h2>
              {editingPlaceId && (
                <button
                  type="button"
                  onClick={resetPlaceForm}
                  className="text-xs font-medium text-slate-600 hover:underline"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSavePlace} className="space-y-3.5">
              <div>
                <label htmlFor="place-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Place Name
                </label>
                <input
                  id="place-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kwame Nkrumah Hall Dining"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="place-category" className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    id="place-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="place-area" className="block text-xs font-medium text-slate-700 mb-1">
                    Campus Area
                  </label>
                  <select
                    id="place-area"
                    value={campusArea}
                    onChange={(e) => setCampusArea(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
                  >
                    <option value="New Site">New Site</option>
                    <option value="Old Site">Old Site</option>
                    <option value="Science & Medical Zone">Science & Medical Zone</option>
                    <option value="Amamoma / Apewosika">Amamoma / Apewosika</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="place-location" className="block text-xs font-medium text-slate-700 mb-1">
                  Location Landmark
                </label>
                <input
                  id="place-location"
                  type="text"
                  required
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="e.g. Beside Main Shuttle Terminal"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label htmlFor="place-hours" className="block text-xs font-medium text-slate-700 mb-1">
                  Opening Hours
                </label>
                <input
                  id="place-hours"
                  type="text"
                  required
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  placeholder="Mon–Sat · 8:00 AM – 10:00 PM"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label htmlFor="place-image" className="block text-xs font-medium text-slate-700 mb-1">
                  Campus Photo Preset
                </label>
                <select
                  id="place-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#0B1F3A]"
                >
                  {IMAGE_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="place-description" className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  id="place-description"
                  rows={3}
                  required
                  minLength={10}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe facilities, seating, noise level, or key student tips..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <button
                type="submit"
                disabled={savingPlace}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E54] disabled:opacity-60 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                {savingPlace ? 'Saving...' : editingPlaceId ? 'Update Campus Place' : 'Add Campus Place'}
              </button>
            </form>
          </section>

          {/* Places Table */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Listed Campus Locations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
                    <th className="py-3 px-4">Place</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Rating</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {places.map((place) => (
                    <tr key={place.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{place.name}</div>
                        <div className="text-xs text-slate-500">{place.campus_area}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{place.category_name}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {place.review_count > 0 ? `${place.avg_rating.toFixed(1)} (${place.review_count})` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditPlace(place)}
                            className="p-1.5 text-slate-600 hover:text-[#0B1F3A] rounded-md hover:bg-slate-100"
                            aria-label={`Edit ${place.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlace(place.id)}
                            className="p-1.5 text-red-600 hover:text-red-700 rounded-md hover:bg-red-50"
                            aria-label={`Delete ${place.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Student Reviews Moderation Queue</h2>
            <span className="text-xs text-slate-500 tabular-nums">{reviews.length} total reviews</span>
          </div>

          {loadingReviews ? (
            <div className="p-8 text-sm text-slate-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No reviews submitted yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    rev.is_flagged ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">{rev.place_name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rev.author_name}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{rev.rating}/5 stars</span>
                      {rev.is_flagged === 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-800">Flagged for review</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{rev.comment}</p>
                    {rev.is_flagged === 1 && rev.flag_reason && (
                      <p className="text-xs text-amber-800">Reason: {rev.flag_reason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rev.is_flagged === 1 && (
                      <button
                        type="button"
                        onClick={() => handleDismissFlag(rev.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                      >
                        Keep & Clear Flag
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap"
                    >
                      Remove Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
