import type { MaterialCategory, PackageMeasure, ServiceCategory } from "@prisma/client";

/** Default services seeded when a branch is created (price 0; owner edits later). */
export const DEFAULT_BRANCH_SERVICES: Array<{
  name: string;
  category: ServiceCategory;
  hairColoringFlow: boolean;
  price: number;
}> = [
  { name: "Haircut", category: "HAIR", hairColoringFlow: false, price: 0 },
  { name: "Hair Coloring", category: "HAIR", hairColoringFlow: true, price: 0 },
  { name: "Balayage", category: "HAIR", hairColoringFlow: true, price: 0 },
  { name: "Rebond", category: "HAIR", hairColoringFlow: false, price: 0 },
  { name: "Perm", category: "HAIR", hairColoringFlow: false, price: 0 },
  { name: "Hair Spa", category: "SPA", hairColoringFlow: false, price: 0 },
  { name: "Keratin Treatment", category: "HAIR", hairColoringFlow: false, price: 0 },
  { name: "Blow Dry", category: "HAIR", hairColoringFlow: false, price: 0 },
  { name: "Manicure", category: "NAILS", hairColoringFlow: false, price: 0 },
  { name: "Pedicure", category: "NAILS", hairColoringFlow: false, price: 0 },
  { name: "Gel Nails", category: "NAILS", hairColoringFlow: false, price: 0 },
];

/** Default materials seeded when a branch is created (stock starts at 0). */
export const DEFAULT_BRANCH_MATERIALS: Array<{
  name: string;
  category: MaterialCategory;
  unit: string;
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
}> = [
  {
    name: "Hair Color",
    category: "HAIR_COLOR",
    unit: "tube",
    packageAmount: 60,
    packageMeasure: "ML",
  },
  {
    name: "Developer",
    category: "DEVELOPER",
    unit: "bottle",
    packageAmount: 1000,
    packageMeasure: "ML",
  },
  {
    name: "Bleach",
    category: "OTHER",
    unit: "pack",
    packageAmount: 500,
    packageMeasure: "GRAM",
  },
  {
    name: "Shampoo",
    category: "OTHER",
    unit: "bottle",
    packageAmount: 1000,
    packageMeasure: "ML",
  },
  {
    name: "Conditioner",
    category: "OTHER",
    unit: "bottle",
    packageAmount: 1000,
    packageMeasure: "ML",
  },
  {
    name: "Treatment",
    category: "OTHER",
    unit: "bottle",
    packageAmount: 500,
    packageMeasure: "ML",
  },
  {
    name: "Massage Oil",
    category: "OTHER",
    unit: "bottle",
    packageAmount: 250,
    packageMeasure: "ML",
  },
  {
    name: "Acetone",
    category: "OTHER",
    unit: "bottle",
    packageAmount: 500,
    packageMeasure: "ML",
  },
];
