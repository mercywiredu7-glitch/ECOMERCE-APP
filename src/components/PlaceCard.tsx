import { useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import type { Place } from '../types';
import { StarDisplay } from './StarRating';

interface PlaceCardProps {
  place: Place;
  onSelect: (placeId: number) => void;
}

export function PlaceCard({ place, onSelect }: PlaceCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors hover:border-slate-300">
      <button
        type="button"
        onClick={() => onSelect(place.id)}
        className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F3A]"
      >
        <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
          {!imgFailed && place.image_url ? (
            <img
              src={place.image_url}
              alt={`${place.name} at University of Cape Coast`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-6 text-slate-500">
              <Building2 className="w-8 h-8 mb-2 text-slate-400" aria-hidden="true" />
              <span className="text-xs font-medium text-center">{place.name}</span>
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
          <span className="truncate">{place.category_name}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap shrink-0">{place.campus_area}</span>
        </div>

        <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-2">
          <button
            type="button"
            onClick={() => onSelect(place.id)}
            className="text-left hover:text-[#0B1F3A] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F3A]"
          >
            {place.name}
          </button>
        </h3>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-4 flex-1">
          {place.description}
        </p>

        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <StarDisplay rating={place.avg_rating} size="sm" />
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {place.review_count > 0 ? place.avg_rating.toFixed(1) : 'New'}
            </span>
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
              ({place.review_count} {place.review_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelect(place.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B1F3A] hover:text-amber-700 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Details
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
