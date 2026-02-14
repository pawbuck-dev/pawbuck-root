/**
 * Vaccination alert periods based on vaccine type and region
 * 
 * Regional differences:
 * - UK/Europe: Rabies not legally required for domestic residency (but mandatory for US/Canada travel)
 *              Leptospirosis (L4) is core standard and must be done annually
 * - US/Canada: Rabies is legally required for licensing in most municipalities
 * 
 * Annual: 12 months
 * Long-term: 36 months (3 years)
 */

// UK/Europe countries
const UK_EUROPE_COUNTRIES = [
  "united kingdom", "uk", "england", "scotland", "wales", "northern ireland",
  "ireland", "france", "germany", "spain", "italy", "netherlands", "belgium",
  "austria", "switzerland", "sweden", "norway", "denmark", "finland", "poland",
  "portugal", "greece", "czech republic", "hungary", "romania", "bulgaria",
  "croatia", "slovakia", "slovenia", "lithuania", "latvia", "estonia",
  "luxembourg", "malta", "cyprus"
];

// US/Canada countries
const US_CANADA_COUNTRIES = [
  "united states", "usa", "us", "canada"
];

export const VACCINATION_ALERT_PERIODS: Record<string, number> = {
  // Annual vaccines (12 months) - consistent across regions
  leptospirosis: 12, // Core in UK, recommended in US/Canada
  "lepto l4": 12, // UK specific
  bordetella: 12,
  "canine influenza": 12,
  lyme: 12,
  
  // Long-term vaccines (36 months)
  dapp: 36,
  dhpp: 36,
  "distemper combo": 36,
  
  // Default fallback
  default: 12,
};

/**
 * Determine if a country is in UK/Europe region
 */
export const isUKEurope = (country: string | null | undefined): boolean => {
  if (!country) return false;
  const normalized = country.toLowerCase().trim();
  return UK_EUROPE_COUNTRIES.some(c => normalized === c || normalized.includes(c) || c.includes(normalized));
};

/**
 * Determine if a country is in US/Canada region
 */
export const isUSCanada = (country: string | null | undefined): boolean => {
  if (!country) return false;
  const normalized = country.toLowerCase().trim();
  return US_CANADA_COUNTRIES.some(c => normalized === c || normalized.includes(c) || c.includes(normalized));
};

/**
 * Get the alert period in months for a vaccination based on its name and region
 * @param vaccineName - The name of the vaccine
 * @param country - The pet's country (optional, for regional differences)
 * @returns Alert period in months (12 for annual, 36 for long-term)
 */
export const getVaccinationAlertPeriod = (
  vaccineName: string,
  country?: string | null
): number => {
  const normalizedName = vaccineName.toLowerCase().trim();
  
  // Special handling for Rabies based on region
  if (normalizedName.includes("rabies")) {
    // US/Canada: Rabies is legally required, use 36 months (3 years) as standard
    // UK/Europe: Not legally required domestically, but may need for travel (still use 36 months for tracking)
    // TODO: Add logic to check certificate for 1-yr vs 3-yr when available
    return 36;
  }
  
  // Leptospirosis is core in UK and should be tracked annually everywhere
  if (normalizedName.includes("leptospirosis") || normalizedName.includes("lepto")) {
    return 12; // Annual everywhere, but especially important in UK
  }
  
  // Check for exact matches first
  if (VACCINATION_ALERT_PERIODS[normalizedName]) {
    return VACCINATION_ALERT_PERIODS[normalizedName];
  }
  
  // Check for partial matches (for variations like "DHPP", "DAPP/DHPP", etc.)
  for (const [key, period] of Object.entries(VACCINATION_ALERT_PERIODS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return period;
    }
  }
  
  // Default to annual (12 months)
  return VACCINATION_ALERT_PERIODS.default;
};

/**
 * Calculate progress percentage for a vaccination based on days until due date
 * Progress represents how close we are to the due date (higher = closer to due)
 * @param daysLeft - Days until the vaccination is due
 * @param alertPeriodMonths - Alert period in months (how far back to look)
 * @returns Progress percentage (0-100), where 100% = due today, 0% = at start of alert period
 */
export const calculateVaccinationProgress = (
  daysLeft: number,
  alertPeriodMonths: number = 12
): number => {
  const alertPeriodDays = alertPeriodMonths * 30; // Approximate month as 30 days
  
  // If daysLeft is 0 or negative, we're at 100% (due or overdue)
  if (daysLeft <= 0) return 100;
  
  // If daysLeft exceeds the alert period, we're at 0% (not in alert period yet)
  if (daysLeft > alertPeriodDays) return 0;
  
  // Progress = how much of the alert period has elapsed
  // If we have 5 days left in a 365 day period, we've used 360/365 = 98.6% of the period
  const elapsedDays = alertPeriodDays - daysLeft;
  const progress = (elapsedDays / alertPeriodDays) * 100;
  
  return Math.max(0, Math.min(100, progress));
};

