import { Star } from 'lucide-react';

interface StarDisplayProps {
  rating: number;
  size?: 'sm' | 'md';
}

export function StarDisplay({ rating, size = 'sm' }: StarDisplayProps) {
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const rounded = Math.round(rating);

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconClass} ${
            star <= rounded
              ? 'fill-amber-500 text-amber-500'
              : 'fill-slate-200 text-slate-200'
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Select star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1.5 rounded-md hover:bg-amber-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F3A]"
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            aria-checked={value === star}
            role="radio"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                active
                  ? 'fill-amber-500 text-amber-500'
                  : 'fill-slate-100 text-slate-300 hover:text-amber-400'
              }`}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-medium text-slate-700 tabular-nums">
        {value} / 5
      </span>
    </div>
  );
}
