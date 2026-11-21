import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Building2, Clock, Flag, MapPin, Pencil, Trash2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { StarDisplay, StarInput } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import type { PlaceDetailResponse, Review } from '../types';

interface PlaceDetailPageProps {
  placeId: number;
  onBack: () => void;
  onOpenAuth: () => void;
  onDataChanged: () => void;
}

export function PlaceDetailPage({
  placeId,
  onBack,
  onOpenAuth,
  onDataChanged,
}: PlaceDetailPageProps) {
  const { user, token } = useAuth();
  const [detail, setDetail] = useState<PlaceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  // New review state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');

  // Inline edit state
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loadPlaceDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<PlaceDetailResponse>(`/api/places/${placeId}`);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load place details.');
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    setImgFailed(false);
    loadPlaceDetail();
  }, [loadPlaceDetail]);

  async function handleCreateReview(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      onOpenAuth();
      return;
    }

    setReviewError('');
    setReviewNotice('');
    setSubmittingReview(true);

    try {
      await apiRequest(
        `/api/places/${placeId}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({ rating: newRating, comment: newComment }),
        },
        token
      );
      setNewComment('');
      setNewRating(5);
      setReviewNotice('Your review has been published.');
      await loadPlaceDetail();
      onDataChanged();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to post review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  function startEditing(review: Review) {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setReviewError('');
  }

  async function handleSaveEdit(reviewId: number) {
    if (!token) return;
    setSavingEdit(true);
    setReviewError('');

    try {
      await apiRequest(
        `/api/reviews/${reviewId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ rating: editRating, comment: editComment }),
        },
        token
      );
      setEditingReviewId(null);
      await loadPlaceDetail();
      onDataChanged();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to update review.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteReview(reviewId: number) {
    if (!token) return;
    setReviewError('');
    try {
      await apiRequest(`/api/reviews/${reviewId}`, { method: 'DELETE' }, token);
      setConfirmDeleteId(null);
      await loadPlaceDetail();
      onDataChanged();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to delete review.');
    }
  }

  async function handleFlagReview(reviewId: number) {
    if (!token) {
      onOpenAuth();
      return;
    }
    try {
      await apiRequest(
        `/api/reviews/${reviewId}/flag`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Reported by student for moderator check' }),
        },
        token
      );
      setReviewNotice('Review flagged for campus moderator review.');
      await loadPlaceDetail();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to flag review.');
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-80 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to places
        </button>
        <div className="p-6 bg-white border border-slate-200 rounded-xl text-sm text-red-700">
          {error || 'Campus place could not be loaded.'}
        </div>
      </div>
    );
  }

  const { place, reviews, ratingBreakdown } = detail;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0B1F3A] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to Campus Places
      </button>

      {/* Place Hero Details */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 bg-slate-100 min-h-[240px]">
            {!imgFailed && place.image_url ? (
              <img
                src={place.image_url}
                alt={`${place.name} at University of Cape Coast`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500">
                <Building2 className="w-10 h-10 mb-2 text-slate-400" aria-hidden="true" />
                <span className="text-sm font-medium">{place.name}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                <span>{place.category_name}</span>
                <span aria-hidden="true">·</span>
                <span>{place.campus_area}</span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-3">
                {place.name}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">
                {place.description}
              </p>

              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{place.location_note}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{place.opening_hours}</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center gap-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-3xl font-bold text-slate-900 tabular-nums">
                    {place.review_count > 0 ? place.avg_rating.toFixed(1) : '—'}
                  </span>
                  <StarDisplay rating={place.avg_rating} size="md" />
                </div>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  Based on {place.review_count} student {place.review_count === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              <div className="flex-1 min-w-[200px] space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingBreakdown[star] || 0;
                  const pct = place.review_count > 0 ? Math.round((count / place.review_count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                      <span className="w-6 text-right">{star}★</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-slate-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Write a Review + Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Write a Review */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Share Your Experience</h2>
          <p className="text-sm text-slate-600 mb-5">
            Rate this location from 1 to 5 stars to help fellow UCC students.
          </p>

          {reviewError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
              {reviewError}
            </div>
          )}

          {reviewNotice && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              {reviewNotice}
            </div>
          )}

          {user && user.id > 0 ? (
            <form onSubmit={handleCreateReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Rating</label>
                <StarInput value={newRating} onChange={setNewRating} />
              </div>

              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Your Review
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  required
                  minLength={5}
                  maxLength={1000}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share details on seating, Wi-Fi, noise level, food quality, or best times to visit..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E54] disabled:opacity-60 rounded-lg transition-colors"
              >
                {submittingReview ? 'Submitting Review...' : 'Post Review'}
              </button>
            </form>
          ) : (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
              <p className="text-sm text-slate-600">
                Sign in with a UCC student account to rate this place and write a review.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E54] rounded-lg transition-colors"
              >
                Sign In to Review
              </button>
            </div>
          )}
        </section>

        {/* Right: Student Reviews */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Student Reviews ({reviews.length})
            </h2>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-sm text-slate-600">
                No reviews yet for this campus location. Be the first student to review it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isOwner = Boolean(user && user.id > 0 && review.user_id === user.id);
                const isEditing = editingReviewId === review.id;
                const formattedDate = new Date(review.created_at.replace(' ', 'T') + 'Z').toLocaleDateString(
                  'en-GH',
                  { year: 'numeric', month: 'short', day: 'numeric' }
                );

                return (
                  <article
                    key={review.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{review.author_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{review.author_programme}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formattedDate}</span>
                        </div>
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1.5">
                          <StarDisplay rating={review.rating} size="sm" />
                          <span className="text-xs font-semibold text-slate-800 tabular-nums">
                            {review.rating}.0
                          </span>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <StarInput value={editRating} onChange={setEditRating} />
                        <textarea
                          rows={3}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => handleSaveEdit(review.id)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] rounded-lg hover:bg-[#132E54] disabled:opacity-60"
                          >
                            {savingEdit ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed">{review.comment}</p>
                    )}

                    {!isEditing && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {isOwner ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startEditing(review)}
                              className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-[#0B1F3A]"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                              Edit
                            </button>

                            {confirmDeleteId === review.id ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-red-700 font-medium">Delete review?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReview(review.id)}
                                  className="font-semibold text-red-700 hover:underline"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-slate-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(review.id)}
                                className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                Delete
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            {review.is_flagged ? 'Flagged for moderation' : 'Student review'}
                          </span>
                        )}

                        {!isOwner && !review.is_flagged && (
                          <button
                            type="button"
                            onClick={() => handleFlagReview(review.id)}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-700"
                          >
                            <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                            Flag review
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
