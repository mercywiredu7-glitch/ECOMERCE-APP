import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api/client';
import { AuthModal } from './components/AuthModal';
import { Navbar, type AppView } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { ModeratorPage } from './pages/ModeratorPage';
import { PlaceDetailPage } from './pages/PlaceDetailPage';
import { PlacesPage } from './pages/PlacesPage';
import type { Category, Place } from './types';

function CampusAppContent() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [browseCategory, setBrowseCategory] = useState<string>('all');
  const [browseSearch, setBrowseSearch] = useState<string>('');
  const [browseSort, setBrowseSort] = useState<'top_rated' | 'most_reviewed' | 'name'>('top_rated');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDirectoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, placeRes] = await Promise.all([
        apiRequest<{ categories: Category[] }>('/api/categories'),
        apiRequest<{ places: Place[] }>('/api/places?sort=top_rated'),
      ]);
      setCategories(catRes.categories);
      setPlaces(placeRes.places);
    } catch {
      // Errors are surfaced cleanly within individual pages
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectoryData();
  }, [loadDirectoryData]);

  function handleNavigate(view: AppView) {
    if (view === 'browse') {
      setBrowseCategory('all');
      setBrowseSearch('');
      setBrowseSort('name');
    } else if (view === 'top-rated') {
      setBrowseCategory('all');
      setBrowseSearch('');
      setBrowseSort('top_rated');
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSelectCategory(slug: string) {
    setBrowseCategory(slug);
    setBrowseSearch('');
    setBrowseSort('top_rated');
    setActiveView('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSearchSubmit(query: string) {
    setBrowseCategory('all');
    setBrowseSearch(query);
    setBrowseSort('top_rated');
    setActiveView('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSelectPlace(placeId: number) {
    setSelectedPlaceId(placeId);
    setActiveView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'home' && (
          <HomePage
            categories={categories}
            places={places}
            loading={loading}
            onSelectCategory={handleSelectCategory}
            onSearchSubmit={handleSearchSubmit}
            onSelectPlace={handleSelectPlace}
            onViewAll={() => handleNavigate('browse')}
            onViewTopRated={() => handleNavigate('top-rated')}
          />
        )}

        {activeView === 'browse' && (
          <PlacesPage
            categories={categories}
            initialCategory={browseCategory}
            initialSearch={browseSearch}
            initialSort={browseSort}
            title="Browse UCC Campus Places"
            subtitle="Filter by campus category, search by name or area, and compare student ratings."
            onSelectPlace={handleSelectPlace}
          />
        )}

        {activeView === 'top-rated' && (
          <PlacesPage
            categories={categories}
            initialCategory="all"
            initialSearch=""
            initialSort="top_rated"
            title="Top-Rated UCC Locations"
            subtitle="Campus favourites ranked by student ratings and verified reviews."
            onSelectPlace={handleSelectPlace}
          />
        )}

        {activeView === 'detail' && selectedPlaceId !== null && (
          <PlaceDetailPage
            placeId={selectedPlaceId}
            onBack={() => handleNavigate('browse')}
            onOpenAuth={() => setAuthModalOpen(true)}
            onDataChanged={loadDirectoryData}
          />
        )}

        {activeView === 'moderator' && (
          <ModeratorPage
            categories={categories}
            places={places}
            onDataChanged={loadDirectoryData}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">UCC Campus Guide</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>University of Cape Coast · AmaliTech Coding Club Learning Project</span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => handleNavigate('home')} className="hover:text-slate-900">
              Home
            </button>
            <button type="button" onClick={() => handleNavigate('browse')} className="hover:text-slate-900">
              Explore
            </button>
            <button type="button" onClick={() => handleNavigate('top-rated')} className="hover:text-slate-900">
              Top Rated
            </button>
            <button type="button" onClick={() => handleNavigate('moderator')} className="hover:text-slate-900">
              Moderator
            </button>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CampusAppContent />
    </AuthProvider>
  );
}
