// src/constants/vaccines.js

export const VACCINE_OPTIONS = [
  // 🐶 Dog vaccines
  { value: "rabies",             label: "Rabies – Dog/Cat" },
  { value: "dhpp",               label: "DHPP (Distemper, Hepatitis, Parvo, Parainfluenza) – Dog" },
  { value: "da2pp",              label: "DA2PP (Distemper, Adenovirus, Parvo, Parainfluenza) – Dog" },
  { value: "da2pp+lepto",        label: "DA2PP + Leptospirosis – Dog" },
  { value: "bordetella",         label: "Bordetella (Kennel Cough) – Dog" },
  { value: "leptospirosis",      label: "Leptospirosis – Dog" },
  { value: "lyme",               label: "Lyme Disease – Dog" },
  { value: "canine-influenza",   label: "Canine Influenza – Dog" },
  { value: "parvo-only",         label: "Parvovirus Only – Dog" },
  { value: "distemper-only",     label: "Distemper Only – Dog" },

  // 🐱 Cat vaccines
  { value: "fvrcp",              label: "FVRCP (Rhinotracheitis, Calicivirus, Panleukopenia) – Cat" },
  { value: "felv",               label: "Feline Leukemia (FeLV) – Cat" },
  { value: "fiv",                label: "Feline Immunodeficiency (FIV) – Cat" },
  { value: "feline-bordetella",  label: "Bordetella – Cat" },
  { value: "feline-chlamydia",   label: "Chlamydia (Chlamydophila felis) – Cat" },

  // combo / other
  { value: "puppy-combo",        label: "Puppy Combo (DHPP + Lepto)" },
  { value: "kitten-combo",       label: "Kitten Combo (FVRCP + FeLV)" },
  { value: "coronavirus-dog",    label: "Canine Coronavirus – Dog" },
  { value: "giardia-dog",        label: "Giardia – Dog" },
  { value: "other",              label: "Other / Custom Vaccine" },
];
