import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { apiRequest } from '../api/client';
import type { Category, Place } from '../types';
import { PlaceCard } from '../components/PlaceCard';

interface PlacesPageProps {
  categories: Category[];
  initialCategory: string;
  initialSearch: string;
  initialSort: 'top_rated' | 'most_reviewed' | 'name';
  title: string;
  subtitle: string;
  onSelectPlace: (placeId: number) => void;
}

export function PlacesPage({
  categories,
  initialCategory,
  initialSearch,
  initialSort,
  title,
  subtitle,
  onSelectPlace,
}: PlacesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'top_rated' | 'most_reviewed' | 'name'>(initialSort);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setSortBy(initialSort);
  }, [initialSort]);

  useEffect(() => {
    let active = true;
    async function loadPlaces() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') {
          params.set('category', selectedCategory);
        }
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }
        params.set('sort', sortBy);

        const res = await apiRequest<{ places: Place[] }>(`/api/places?${params.toString()}`);
        if (active) {
          setPlaces(res.places);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load campus places.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPlaces();
    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1.5">{subtitle}</p>
      </div>

      {/* Search & Sort Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by place name or campus area (e.g. Old Site, Valco, Library)..."
              aria-label="Search campus places"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="places-sort" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="places-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'top_rated' | 'most_reviewed' | 'name')}
              className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#0B1F3A]"
            >
              <option value="top_rated">Top Rated</option>
              <option value="most_reviewed">Most Reviewed</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#0B1F3A] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.slug
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
        <span>
          Showing {places.length} {places.length === 1 ? 'place' : 'places'}
          {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}
        </span>
        {(selectedCategory !== 'all' || searchQuery.trim()) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="font-semibold text-[#0B1F3A] hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No matching campus places</h3>
          <p className="text-sm text-slate-600 mb-4">
            Try clearing your search term or selecting a different category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1F3A] rounded-lg hover:bg-[#132E54]"
          >
            Show All Places
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} onSelect={onSelectPlace} />
          ))}
        </div>
      )}
    </div>
  );
}
