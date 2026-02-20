export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: "1",
    question: "What is PawBuck?",
    answer:
      "PawBuck is your pet's personal health operating system. Every pet gets their own email address (like milo@pawbuck.app) that automatically organizes all their health documents in one secure, searchable place.",
  },
  {
    id: "2",
    question: "How is PawBuck different from other pet apps?",
    answer:
      "Your pet has a real email address. Forward vet bills, vaccination records, or prescriptions to your pet's email, and PawBuck automatically parses and organizes everything into their health profile. You can also upload documents manually anytime.",
  },
  {
    id: "3",
    question: "How does my pet's email address work?",
    answer:
      "When you create a profile for your pet, they get a unique email address (yourpet@pawbuck.app). Any health document sent to this address is automatically saved, categorized, and added to their health record.",
  },
  {
    id: "4",
    question: "What can I send to my pet's email?",
    answer:
      "Anything health-related: vet invoices, vaccination certificates, prescription records, lab results, and medical reports.",
  },
  {
    id: "5",
    question: "Does PawBuck read the documents?",
    answer:
      "Yes. Our system automatically extracts key information like visit dates, vaccinations, medications, and costs so you don't have to enter anything manually.",
  },
  {
    id: "6",
    question: "What if my vet doesn't use PawBuck?",
    answer:
      "That's exactly what the email system solves. Simply ask your vet to email or CC your pet's PawBuck address when sending documents. No vet integration needed.",
  },
  {
    id: "7",
    question: "What information is stored in my pet's health profile?",
    answer:
      "Vaccination records, vet visit history, medications, allergies, dietary requirements, microchip number, vet contact information, and all forwarded documents.",
  },
  {
    id: "8",
    question: "Can I add information manually?",
    answer:
      "Yes. You can upload documents, add notes, update details, or add photos anytime in the app.",
  },
  {
    id: "9",
    question: "How do I share my pet's records?",
    answer:
      "Use the 'Download Pet Passport' option to create a complete health record you can share with vets, boarders, or caregivers.",
  },
  {
    id: "10",
    question: "What if I don't have all my pet's past records?",
    answer:
      "Start fresh and begin forwarding documents from now on. You can request past records from your vet anytime.",
  },
  {
    id: "11",
    question: "How much does PawBuck cost?",
    answer:
      "PawBuck is free forever. Your pet's health record, email address, and document organization are included at no cost.",
  },
  {
    id: "12",
    question: "How do I get started?",
    answer:
      "Download the PawBuck app, create your account, and set up your pet's profile to receive their unique email address.",
  },
  {
    id: "13",
    question: "Do I need my pet's microchip number?",
    answer:
      "Not required, but recommended. A microchip helps uniquely identify your pet if they are lost.",
  },
  {
    id: "14",
    question: "Can I manage multiple pets?",
    answer:
      "Yes. Each pet gets their own profile and email address under one account.",
  },
  {
    id: "15",
    question: "Do I need to enter all health information at once?",
    answer:
      "No. You can build your pet's health history gradually as documents arrive.",
  },
  {
    id: "16",
    question: "What if I already have paper records or PDFs?",
    answer:
      "Email them to your pet's PawBuck address or upload them directly in the app. PawBuck will organize them automatically.",
  },
];
