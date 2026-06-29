const UK_EUROPE_COUNTRIES = [
  "united kingdom", "uk", "england", "scotland", "wales", "northern ireland",
  "ireland", "france", "germany", "spain", "italy", "netherlands", "belgium",
];

const VACCINATION_ALERT_PERIODS: Record<string, number> = {
  leptospirosis: 12,
  "lepto l4": 12,
  bordetella: 12,
  "canine influenza": 12,
  lyme: 12,
  dapp: 36,
  dhpp: 36,
  "distemper combo": 36,
  default: 12,
};

export function getVaccinationAlertPeriodMonths(
  vaccineName: string,
  _country?: string | null
): number {
  const normalizedName = vaccineName.toLowerCase().trim();

  if (normalizedName.includes("rabies")) return 36;
  if (normalizedName.includes("leptospirosis") || normalizedName.includes("lepto")) return 12;

  if (VACCINATION_ALERT_PERIODS[normalizedName]) {
    return VACCINATION_ALERT_PERIODS[normalizedName];
  }

  for (const [key, period] of Object.entries(VACCINATION_ALERT_PERIODS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return period;
    }
  }

  return VACCINATION_ALERT_PERIODS.default;
}
