/**
 * Demo nearby clinics for booking flow. Location is spoofed to Vancouver, BC.
 * Replace with PawBuck.API + real geocoding when scheduling backend is live.
 */

export type MockNearbyVet = {
  id: string;
  name: string;
  address: string;
  city: string;
  /** WGS84 — used for map markers and Google Maps directions */
  latitude: number;
  longitude: number;
  distanceKm: number;
  rating: number;
  reviewCount: number;
};

/** Fixed reference point: downtown Vancouver (demo / spoofed user location). */
export const SPOOFED_LOCATION = {
  label: "Vancouver, BC",
  subtitle: "Canada",
  latitude: 49.2827,
  longitude: -123.1207,
} as const;

export const MOCK_VANCOUVER_VETS: MockNearbyVet[] = [
  {
    id: "1",
    name: "Yaletown Pet Hospital",
    address: "893 Expo Blvd",
    city: "Vancouver, BC",
    latitude: 49.27465,
    longitude: -123.11685,
    distanceKm: 1.2,
    rating: 4.8,
    reviewCount: 214,
  },
  {
    id: "2",
    name: "Arbutus West Animal Clinic",
    address: "2655 Arbutus St",
    city: "Vancouver, BC",
    latitude: 49.26385,
    longitude: -123.15765,
    distanceKm: 2.4,
    rating: 4.7,
    reviewCount: 189,
  },
  {
    id: "3",
    name: "Canada West Veterinary Specialists",
    address: "752 W Broadway",
    city: "Vancouver, BC",
    latitude: 49.26345,
    longitude: -123.12575,
    distanceKm: 2.9,
    rating: 4.9,
    reviewCount: 412,
  },
  {
    id: "4",
    name: "Kitsilano Animal Clinic",
    address: "2270 W 4th Ave",
    city: "Vancouver, BC",
    latitude: 49.26835,
    longitude: -123.15755,
    distanceKm: 3.1,
    rating: 4.6,
    reviewCount: 156,
  },
  {
    id: "5",
    name: "Burrard Animal Hospital",
    address: "1847 Burrard St",
    city: "Vancouver, BC",
    latitude: 49.2714,
    longitude: -123.13995,
    distanceKm: 1.8,
    rating: 4.5,
    reviewCount: 98,
  },
];
