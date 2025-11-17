// src/constants/pets.js

// =====================
// 1) Species Options
// =====================
export const SPECIES_OPTIONS = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "small-mammal", label: "Small Mammal" }, // Guinea Pig, Hamster
  { value: "reptile", label: "Reptile" },
  { value: "other", label: "Other" },
];

// =====================
// 2) Breeds by species
// =====================

export const BREED_OPTIONS = {
  dog: [
    { value: "mixed-dog", label: "Mixed / Local Dog" },
    { value: "labrador", label: "Labrador Retriever" },
    { value: "golden-retriever", label: "Golden Retriever" },
    { value: "poodle", label: "Poodle" },
    { value: "chihuahua", label: "Chihuahua" },
    { value: "pomeranian", label: "Pomeranian" },
    { value: "shih-tzu", label: "Shih Tzu" },
    { value: "beagle", label: "Beagle" },
    { value: "bulldog", label: "Bulldog" },
    { value: "husky", label: "Siberian Husky" },
    { value: "thai-ridgeback", label: "Thai Ridgeback" },
    { value: "bangkaew", label: "Bang Kaew" },
  ],

  cat: [
    { value: "thai", label: "Thai Cat" },
    { value: "scottish-fold", label: "Scottish Fold" },
    { value: "persian", label: "Persian" },
    { value: "american-shorthair", label: "American Shorthair" },
    { value: "british-shorthair", label: "British Shorthair" },
    { value: "siamese", label: "Siamese" },
    { value: "ragdoll", label: "Ragdoll" },
    { value: "maine-coon", label: "Maine Coon" },
    { value: "exotic-shorthair", label: "Exotic Shorthair" },
  ],

  rabbit: [
    { value: "holland-lop", label: "Holland Lop" },
    { value: "netherland-dwarf", label: "Netherland Dwarf" },
    { value: "rex", label: "Rex Rabbit" },
    { value: "lionhead", label: "Lionhead Rabbit" },
  ],

  bird: [
    { value: "budgerigar", label: "Budgerigar" },
    { value: "cockatiel", label: "Cockatiel" },
    { value: "lovebird", label: "Lovebird" },
    { value: "parrot", label: "Parrot" },
  ],

  "small-mammal": [
    { value: "guinea-pig", label: "Guinea Pig" },
    { value: "hamster", label: "Hamster" },
    { value: "ferret", label: "Ferret" },
  ],

  reptile: [
    { value: "bearded-dragon", label: "Bearded Dragon" },
    { value: "leopard-gecko", label: "Leopard Gecko" },
    { value: "turtle", label: "Turtle" },
  ],

  other: [
    { value: "other", label: "Other / Not Listed" }
  ]
};
