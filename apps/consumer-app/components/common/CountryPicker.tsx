import { ONBOARDING_COUNTRY_OPTIONS } from "@/constants/onboardingCountries";
import SearchableCountryModal from "./SearchableCountryModal";

type CountryPickerProps = {
  visible: boolean;
  selectedCountry: string;
  onSelect: (country: string) => void;
  onClose: () => void;
};

/**
 * Searchable flag country list (shared onboarding + profile country edits).
 */
export default function CountryPicker({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}: CountryPickerProps) {
  return (
    <SearchableCountryModal
      visible={visible}
      countries={ONBOARDING_COUNTRY_OPTIONS}
      selectedCountry={selectedCountry}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
