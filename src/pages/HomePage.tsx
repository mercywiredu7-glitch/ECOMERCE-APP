import React, { useState } from 'react';
import { Search, ArrowRight, Building2 } from 'lucide-react';
import type { Category, Place } from '../types';
import { PlaceCard } from '../components/PlaceCard';

interface HomePageProps {
  categories: Category[];
  places: Place[];
  loading: boolean;
  onSelectCategory: (slug: string) => void;
  onSearchSubmit: (query: string) => void;
  onSelectPlace: (placeId: number) => void;
  onViewAll: () => void;
  onViewTopRated: () => void;
}

export function HomePage({
  categories,
  places,
  loading,
  onSelectCategory,
  onSearchSubmit,
  onSelectPlace,
  onViewAll,
  onViewTopRated,
}: HomePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const topRatedPlaces = [...places]
    .sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
    .slice(0, 3);

  const featuredPlaces = places.slice(0, 6);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearchSubmit(searchTerm.trim());
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-medium text-amber-700 mb-3">
                University of Cape Coast · Student Community Guide
              </p>

              <h1
                className="font-display text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-5 max-w-2xl"
                style={{ textWrap: 'balance' }}
              >
                Find the best study spots, dining halls, and spaces across UCC
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                Honest ratings and practical reviews from University of Cape Coast students—covering libraries, lecture theatres, hostels, cafeterias, and tech labs.
              </p>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mb-6">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Sam Jonah Library, Valco, SLT..."
                    aria-label="Search UCC campus places"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E54] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Search Places
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 tabular-nums">
                <span>{places.length} campus locations listed</span>
                <span aria-hidden="true">·</span>
                <span>{categories.length} campus categories</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onViewAll}
                  className="font-semibold text-[#0B1F3A] hover:underline"
                >
                  Browse full directory
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/ucc_campus_hero_1795264651028.jpg"
                    alt="University of Cape Coast campus promenade and library at golden hour"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500 bg-slate-100">
                    <Building2 className="w-10 h-10 mb-2 text-slate-400" aria-hidden="true" />
                    <span className="text-sm font-medium">University of Cape Coast Campus</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Browse by Category</h2>
            <p className="text-sm text-slate-600 mt-1">
              Explore UCC locations grouped by how students use campus every day.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className="group text-left p-5 bg-white border border-slate-200 rounded-xl hover:border-[#0B1F3A] transition-colors flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#0B1F3A]">
                    {cat.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                    {cat.place_count} {cat.place_count === 1 ? 'place' : 'places'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{cat.description}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B1F3A] group-hover:text-amber-700">
                Explore category
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Top-Rated Campus Places */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Top-Rated Campus Places</h2>
            <p className="text-sm text-slate-600 mt-1">
              Highest-rated spots across Old Site and New Site based on student reviews.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewTopRated}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A] hover:text-amber-700 whitespace-nowrap shrink-0"
          >
            View all top rated
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topRatedPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} onSelect={onSelectPlace} />
            ))}
          </div>
        )}
      </section>

      {/* Campus Directory Preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Campus Listings</h2>
            <p className="text-sm text-slate-600 mt-1">
              Discover lecture halls, cafeterias, study spaces, and residence courtyards.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A] hover:text-amber-700 whitespace-nowrap shrink-0"
          >
            Browse all places
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} onSelect={onSelectPlace} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
