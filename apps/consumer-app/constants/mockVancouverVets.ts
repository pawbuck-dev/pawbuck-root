/**
 * Demo nearby clinics for booking flow. Location is spoofed to Vancouver, BC.
 * Distances are computed with {@link haversineDistanceKm} from {@link SPOOFED_LOCATION}.
 * Use {@link filterVetsBySearchRadius} + {@link NEARBY_VET_RADIUS_OPTIONS_KM} in the UI.
 */

import { haversineDistanceKm } from "@/utils/haversine";

export type MockNearbyVet = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  /**
   * PawBuck.API scheduling clinic id (matches `Scheduling:Clinics` in appsettings).
   * When set and `EXPO_PUBLIC_PAWBUCK_API_URL` is configured, the app loads slots from the API.
   */
  schedulingClinicId?: string;
};

type VetClinicSeed = Omit<MockNearbyVet, "distanceKm">;

/** Fixed reference point: downtown Vancouver (demo / spoofed user location). */
export const SPOOFED_LOCATION = {
  label: "Vancouver, BC",
  subtitle: "Canada",
  latitude: 49.2827,
  longitude: -123.1207,
} as const;

/** Preset search radii shown on the book-a-visit screen (km). */
export const NEARBY_VET_RADIUS_OPTIONS_KM = [10, 25, 50] as const;
export type NearbyVetRadiusKm = (typeof NEARBY_VET_RADIUS_OPTIONS_KM)[number];

export const DEFAULT_NEARBY_VET_RADIUS_KM: NearbyVetRadiusKm = 25;

const VET_CLINIC_SEEDS: VetClinicSeed[] = [
  {
    id: "1",
    schedulingClinicId: "00000000-0000-0000-0000-000000000001",
    name: "Yaletown Pet Hospital",
    address: "893 Expo Blvd",
    city: "Vancouver, BC",
    latitude: 49.27465,
    longitude: -123.11685,
    rating: 4.8,
    reviewCount: 214,
  },
  {
    id: "2",
    schedulingClinicId: "00000000-0000-0000-0000-000000000002",
    name: "Arbutus West Animal Clinic",
    address: "2655 Arbutus St",
    city: "Vancouver, BC",
    latitude: 49.26385,
    longitude: -123.15765,
    rating: 4.7,
    reviewCount: 189,
  },
  {
    id: "3",
    schedulingClinicId: "00000000-0000-0000-0000-000000000003",
    name: "Canada West Veterinary Specialists",
    address: "752 W Broadway",
    city: "Vancouver, BC",
    latitude: 49.26345,
    longitude: -123.12575,
    rating: 4.9,
    reviewCount: 412,
  },
  {
    id: "4",
    schedulingClinicId: "00000000-0000-0000-0000-000000000004",
    name: "Kitsilano Animal Clinic",
    address: "2270 W 4th Ave",
    city: "Vancouver, BC",
    latitude: 49.26835,
    longitude: -123.15755,
    rating: 4.6,
    reviewCount: 156,
  },
  {
    id: "5",
    schedulingClinicId: "00000000-0000-0000-0000-000000000005",
    name: "Burrard Animal Hospital",
    address: "1847 Burrard St",
    city: "Vancouver, BC",
    latitude: 49.2714,
    longitude: -123.13995,
    rating: 4.5,
    reviewCount: 98,
  },
  {
    id: "6",
    name: "Commercial Drive Vet Clinic",
    address: "2150 Commercial Dr",
    city: "Vancouver, BC",
    latitude: 49.2678,
    longitude: -123.0698,
    rating: 4.6,
    reviewCount: 142,
  },
  {
    id: "7",
    name: "UBC Veterinary Centre",
    address: "5779 University Blvd",
    city: "Vancouver, BC",
    latitude: 49.2642,
    longitude: -123.2464,
    rating: 4.7,
    reviewCount: 203,
  },
  {
    id: "8",
    name: "Lonsdale Animal Hospital",
    address: "125 E 13th St",
    city: "North Vancouver, BC",
    latitude: 49.3112,
    longitude: -123.0715,
    rating: 4.8,
    reviewCount: 267,
  },
  {
    id: "9",
    name: "Metrotown Pet Hospital",
    address: "4700 Kingsway",
    city: "Burnaby, BC",
    latitude: 49.2254,
    longitude: -122.9991,
    rating: 4.5,
    reviewCount: 331,
  },
  {
    id: "10",
    name: "Richmond Veterinary Hospital",
    address: "8260 Westminster Hwy",
    city: "Richmond, BC",
    latitude: 49.1689,
    longitude: -123.1365,
    rating: 4.6,
    reviewCount: 298,
  },
  {
    id: "11",
    name: "New Westminster Animal Clinic",
    address: "620 Sixth St",
    city: "New Westminster, BC",
    latitude: 49.2087,
    longitude: -122.9174,
    rating: 4.4,
    reviewCount: 175,
  },
  {
    id: "12",
    name: "Coquitlam Veterinary Hospital",
    address: "2608 St Johns St",
    city: "Port Moody, BC",
    latitude: 49.2831,
    longitude: -122.8652,
    rating: 4.7,
    reviewCount: 224,
  },
  {
    id: "13",
    name: "Surrey Central Pet Care",
    address: "10355 King George Blvd",
    city: "Surrey, BC",
    latitude: 49.1895,
    longitude: -122.8479,
    rating: 4.3,
    reviewCount: 412,
  },
  {
    id: "14",
    name: "White Rock Animal Clinic",
    address: "1481 Johnston Rd",
    city: "White Rock, BC",
    latitude: 49.0271,
    longitude: -122.8031,
    rating: 4.6,
    reviewCount: 156,
  },
];

function withDistance(seed: VetClinicSeed): MockNearbyVet {
  return {
    ...seed,
    distanceKm: haversineDistanceKm(SPOOFED_LOCATION, seed),
  };
}

/** All demo clinics with distances from {@link SPOOFED_LOCATION}, nearest first. */
export const ALL_DEMO_VET_CLINICS: MockNearbyVet[] = [...VET_CLINIC_SEEDS]
  .map(withDistance)
  .sort((a, b) => a.distanceKm - b.distanceKm);

/**
 * Clinics within `radiusKm` of the spoofed location, sorted by distance.
 */
export function filterVetsBySearchRadius(vets: MockNearbyVet[], radiusKm: number): MockNearbyVet[] {
  return vets.filter((v) => v.distanceKm <= radiusKm);
}
