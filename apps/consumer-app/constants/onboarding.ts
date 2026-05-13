import { onboardingCountryFlags } from "./onboardingCountries";

/** Country name → flag emoji; aligned with {@link ONBOARDING_COUNTRY_OPTIONS}. */
export const COUNTRY_FLAGS: Record<string, string> = onboardingCountryFlags();


/** Quick picks when the breed search box is empty (must exist in {@link CAT_BREEDS}). */
export const POPULAR_CAT_BREEDS_FOR_PICKER = [
  "British Shorthair",
  "Maine Coon",
  "Persian",
  "Ragdoll",
  "Siamese",
  "American Shorthair",
  "Bengal",
  "Unknown",
];

/** Quick picks when the breed search box is empty (must exist in {@link DOG_BREEDS}). */
export const POPULAR_DOG_BREEDS_FOR_PICKER = [
  "Labrador Retriever",
  "Golden Retriever",
  "French Bulldog",
  "German Shepherd Dog",
  "Poodle",
  "Bulldog",
  "Beagle",
  "Dachshund",
  "Unknown",
];

export const CAT_BREEDS = [
   "Abyssinian", "Aegean", "American Bobtail", "American Curl", "American Shorthair", "American Wirehair", "Aphrodite Giant", "Arabian Mau", "Asian cat", "Australian Mist",
    "Balinese", "Bambino", "Bengal", "Birman", "Bombay", "British Longhair", "British Shorthair", "Burmese", "Burmilla",
    "California Spangled", "Chantilly-Tiffany", "Chartreux", "Chausie", "Colorpoint Shorthair", "Cornish Rex", "Cymric", "Cyprus",
    "Devon Rex", "Donskoy", "Dragon Li", "Dwelf", "Egyptian Mau", "European Shorthair", "Exotic Shorthair",
    "Foldex", "German Rex", "Havana Brown", "Highlander", "Himalayan",
    "Japanese Bobtail", "Javanese", "Khao Manee", "Korat", "Kurilian Bobtail",
    "LaPerm", "Lykoi", "Maine Coon", "Manx", "Mekong Bobtail", "Minuet", "Munchkin",
    "Nebelung", "Norwegian Forest Cat", "Ocicat", "Oriental Bicolor", "Oriental Longhair", "Oriental Shorthair",
    "Persian", "Peterbald", "Pixie-bob", "Ragamuffin", "Ragdoll", "Russian Blue",
    "Savannah", "Scottish Fold", "Selkirk Rex", "Siamese", "Siberian", "Singapura", "Snowshoe", "Sokoke", "Somali", "Sphynx",
    "Thai", "Tonkinese", "Toyger", "Turkish Angora", "Turkish Van", "York Chocolate",
    "Unknown"
  ];


export const DOG_BREEDS = [
      "Affenpinscher", "Afghan Hound", "Airedale Terrier", "Akita", "Alaskan Malamute", "American Bulldog", "American Cocker Spaniel", "American English Coonhound", "American Eskimo Dog", "American Foxhound", "American Staffordshire Terrier", "Anatolian Shepherd Dog", "Australian Cattle Dog", "Australian Shepherd", "Australian Terrier",
      "Basenji", "Basset Hound", "Beagle", "Bearded Collie", "Beauceron", "Bedlington Terrier", "Belgian Malinois", "Belgian Sheepdog", "Belgian Tervuren", "Bernese Mountain Dog", "Bichon Frise", "Black and Tan Coonhound", "Bloodhound", "Border Collie", "Border Terrier", "Borzoi", "Boston Terrier", "Bouvier des Flandres", "Boxer", "Boykin Spaniel", "Briard", "Brittany", "Brussels Griffon", "Bull Terrier", "Bulldog", "Bullmastiff",
      "Cairn Terrier", "Canaan Dog", "Cane Corso", "Cardigan Welsh Corgi", "Cavalier King Charles Spaniel", "Chesapeake Bay Retriever", "Chihuahua", "Chinese Crested", "Chinese Shar-Pei", "Chow Chow", "Clumber Spaniel", "Cocker Spaniel", "Collie", "Coton de Tulear", "Curly-Coated Retriever",
      "Dachshund", "Dalmatian", "Dandie Dinmont Terrier", "Doberman Pinscher", "Dogue de Bordeaux",
      "English Cocker Spaniel", "English Setter", "English Springer Spaniel", "English Toy Spaniel", "Entlebucher Mountain Dog",
      "Field Spaniel", "Finnish Lapphund", "Finnish Spitz", "Flat-Coated Retriever", "French Bulldog",
      "German Pinscher", "German Shepherd Dog", "German Shorthaired Pointer", "German Wirehaired Pointer", "Giant Schnauzer", "Glen of Imaal Terrier", "Golden Retriever", "Gordon Setter", "Great Dane", "Great Pyrenees", "Greater Swiss Mountain Dog", "Greyhound",
      "Harrier", "Havanese", "Ibizan Hound", "Icelandic Sheepdog", "Irish Red and White Setter", "Irish Setter", "Irish Terrier", "Irish Water Spaniel", "Irish Wolfhound", "Italian Greyhound",
      "Jack Russell Terrier", "Japanese Chin", "Keeshond", "Kerry Blue Terrier", "Komondor", "Kuvasz", "Labrador Retriever", "Lakeland Terrier", "Leonberger", "Lhasa Apso", "Lowchen",
      "Maltese", "Manchester Terrier", "Mastiff", "Miniature American Shepherd", "Miniature Bull Terrier", "Miniature Pinscher", "Miniature Schnauzer", "Neapolitan Mastiff", "Newfoundland", "Norfolk Terrier", "Norwegian Elkhound", "Norwegian Lundehund", "Norwich Terrier", "Nova Scotia Duck Tolling Retriever",
      "Old English Sheepdog", "Otterhound", "Papillon", "Parson Russell Terrier", "Pekingese", "Pembroke Welsh Corgi", "Petit Basset Griffon Vendéen", "Pharaoh Hound", "Plott Hound", "Pointer", "Polish Lowland Sheepdog", "Pomeranian", "Poodle", "Portuguese Water Dog", "Pug", "Puli", "Pumi",
      "Rat Terrier", "Redbone Coonhound", "Rhodesian Ridgeback", "Rottweiler", "Russell Terrier",
      "Saint Bernard", "Saluki", "Samoyed", "Schipperke", "Scottish Deerhound", "Scottish Terrier", "Sealyham Terrier", "Shetland Sheepdog", "Shiba Inu", "Shih Tzu", "Siberian Husky", "Silky Terrier", "Skye Terrier", "Soft Coated Wheaten Terrier", "Spanish Water Dog", "Spinone Italiano", "Staffordshire Bull Terrier", "Standard Schnauzer", "Sussex Spaniel",
      "Tibetan Mastiff", "Tibetan Spaniel", "Tibetan Terrier", "Toy Fox Terrier", "Treeing Walker Coonhound", "Vizsla",
      "Weimaraner", "Welsh Springer Spaniel", "Welsh Terrier", "West Highland White Terrier", "Whippet", "Wire Fox Terrier", "Wirehaired Pointing Griffon", "Wirehaired Vizsla", "Xoloitzcuintli", "Yorkshire Terrier",
      "Unknown",
  ];