export type RoastLevel =
  | "light"
  | "light-medium"
  | "medium"
  | "medium-dark"
  | "dark";

export type ProcessMethod =
  | "washed"
  | "natural"
  | "honey"
  | "anaerobic-natural"
  | "anaerobic-washed"
  | "carbonic-maceration"
  | "wet-hulled"
  | "experimental"
  | "other";

export type BrewMethodType =
  | "v60"
  | "aeropress"
  | "chemex"
  | "french-press"
  | "espresso"
  | "flair"
  | "kalita-wave"
  | "origami"
  | "clever-dripper"
  | "moka-pot"
  | "cold-brew"
  | "custom";

export type EquipmentType = "grinder" | "brewer" | "scale" | "kettle" | "other";

export interface Equipment {
  id: string;
  userId?: string;
  type: EquipmentType;
  brand: string;
  model: string;
  subType?: string; // e.g. "flat-burr", "conical-burr", "lever-espresso"
  settingScaleType?: "clicks" | "stepped-numbers" | "stepless" | "microns";
  isFavorite?: boolean;
  notes?: string;
  createdAt: string;
}

export interface Bean {
  id: string;
  userId?: string;
  name: string;
  roaster: string;
  originCountry?: string;
  region?: string;
  farm?: string;
  variety?: string[];
  altitudeMeters?: number;
  process?: ProcessMethod;
  roastLevel?: RoastLevel;
  roastDate?: string; // YYYY-MM-DD
  flavorNotes: string[];
  rating?: number; // 1-5 stars
  bagWeightGrams?: number;
  bagWeightOz?: number;
  remainingOz?: number;
  remainingGrams?: number;
  price?: number;
  isFavorite?: boolean;
  recommendedRestDays?: number;
  isFrozen?: boolean;
  frozenDate?: string;
  isArchived?: boolean;
  notes?: string;
  createdAt: string;
}

export type TimerMode = 'recipe' | 'free_brew';

export type SplitTag = 'bloom' | 'pour' | 'drawdown' | 'custom';

export interface BrewSplit {
  id: string;
  second: number;
  intervalSeconds: number;
  label: string;
  tag?: SplitTag;
  waterWeightGrams?: number;
}

export type StageType = "bloom" | "pour" | "agitation" | "drawdown" | "press" | "wait" | "other";

export interface BrewStage {
  id: string;
  name: string;
  startSecond: number;
  durationSeconds: number;
  targetWaterWeightGrams: number;
  instruction: string;
  stageType: StageType;
}

export interface BrewRecipe {
  id: string;
  userId?: string;
  name: string;
  brewMethod: BrewMethodType;
  recommendedBrewerId?: string;
  recommendedGrinderId?: string;
  description: string;
  author?: string;
  coffeeDoseGrams: number;
  waterAmountGrams: number;
  ratio: number; // e.g. 15 for 1:15, 16.67 for 1:16.67
  grindSize: string;
  waterTempCelsius: number;
  totalTimeSeconds: number;
  stages: BrewStage[];
  notes?: string;
  isPreset?: boolean;
  isFavorite?: boolean;
  createdAt: string;
}

export interface CuppingAttributes {
  fragranceAroma: number; // 0-10 (typically 6.00-10.00 in SCA protocol)
  flavor: number;         // 0-10 (typically 6.00-10.00 in SCA protocol)
  aftertaste: number;     // 0-10 (typically 6.00-10.00 in SCA protocol)
  acidity: number;        // 0-10 (typically 6.00-10.00 in SCA protocol)
  body: number;           // 0-10 (typically 6.00-10.00 in SCA protocol)
  balance: number;        // 0-10 (typically 6.00-10.00 in SCA protocol)
  uniformity: number;     // 0-10 (2 pts/cup across 5 cups, standard baseline 10)
  cleanCup: number;       // 0-10 (2 pts/cup across 5 cups, standard baseline 10)
  sweetness: number;      // 0-10 (2 pts/cup across 5 cups, standard baseline 10)
  overall: number;        // 0-10 (typically 6.00-10.00 in SCA protocol)
  clarity?: number;       // legacy fallback support for older logs
}

export interface TastingLog {
  id: string;
  userId?: string;
  beanId?: string;
  recipeId?: string;
  grinderId?: string;
  brewerId?: string;
  grinderSnapshot?: string;
  brewerSnapshot?: string;
  beanNameSnapshot: string;
  roasterSnapshot: string;
  recipeNameSnapshot: string;
  brewMethod: BrewMethodType;
  brewDate: string; // ISO string
  coffeeDoseGrams: number;
  waterAmountGrams: number;
  actualTimeSeconds: number;
  grindSetting: string;
  waterTempCelsius: number;
  scores: CuppingAttributes;
  calculatedScaScore: number; // 0-100
  rating: number; // 1-5 quick stars
  flavorTags: string[];
  notes: string;
  wouldBrewAgain: boolean;
  createdAt: string;
}

export interface FlavorWheelNode {
  name: string;
  color: string;
  subcategories?: {
    name: string;
    color: string;
    descriptors?: string[];
  }[];
}
