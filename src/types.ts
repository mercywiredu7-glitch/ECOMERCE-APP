export interface User {
  id: number;
  fullName: string;
  email: string;
  programme: string;
  role: 'student' | 'moderator';
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  place_count: number;
}

export interface Place {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  campus_area: string;
  location_note: string;
  opening_hours: string;
  description: string;
  image_url: string;
  created_at: string;
  avg_rating: number;
  review_count: number;
}

export interface Review {
  id: number;
  place_id: number;
  user_id: number;
  author_name: string;
  author_programme: string;
  rating: number;
  comment: string;
  is_flagged: number;
  created_at: string;
  updated_at: string;
}

export interface PlaceDetailResponse {
  place: Place;
  reviews: Review[];
  ratingBreakdown: Record<number, number>;
}

export interface ModeratorReview {
  id: number;
  place_id: number;
  place_name: string;
  user_id: number;
  author_name: string;
  author_email: string;
  rating: number;
  comment: string;
  is_flagged: number;
  flag_reason: string | null;
  created_at: string;
}

export interface ModeratorStatus {
  envConfigured: boolean;
  needsSetup: boolean;
  isModerator: boolean;
}
