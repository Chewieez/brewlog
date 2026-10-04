import { Bean, Equipment, TastingLog, DEFAULT_PRESET_RECIPES, DEFAULT_INITIAL_EQUIPMENT } from '@brewlog/core';

export const INITIAL_BEANS: Bean[] = [
  {
    id: 'bean-1',
    name: 'Worka Sakaro Anaerobic',
    roaster: 'Sey Coffee',
    originCountry: 'Ethiopia',
    region: 'Gedeb, Yirgacheffe',
    farm: 'Worka Sakaro Washing Station',
    variety: ['Kurume', 'Dega'],
    altitudeMeters: 2100,
    process: 'anaerobic-natural',
    roastLevel: 'light',
    roastDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 days ago
    flavorNotes: ['Jasmine', 'Peach', 'Bergamot', 'Papaya'],
    rating: 4.8,
    bagWeightGrams: 250,
    remainingGrams: 180,
    price: 24.0,
    isFavorite: true,
    notes: 'Incredible clarity and floral sweetness. Best on V60 at 96°C.',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_EQUIPMENT: Equipment[] = DEFAULT_INITIAL_EQUIPMENT;

export const INITIAL_TASTING_LOGS: TastingLog[] = [
  {
    id: 'log-1',
    beanNameSnapshot: 'Worka Sakaro Anaerobic',
    roasterSnapshot: 'Sey Coffee',
    recipeNameSnapshot: 'Ultimate V60 (James Hoffmann)',
    brewMethod: 'v60',
    brewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    coffeeDoseGrams: 30,
    waterAmountGrams: 500,
    actualTimeSeconds: 212,
    grindSetting: 'Fellow Ode 4.1',
    waterTempCelsius: 98,
    scores: {
      fragranceAroma: 9.0,
      flavor: 9.2,
      aftertaste: 8.8,
      acidity: 8.8,
      body: 7.8,
      balance: 9.0,
      uniformity: 10.0,
      cleanCup: 10.0,
      sweetness: 9.2,
      overall: 9.2,
    },
    calculatedScaScore: 91.0,
    rating: 4.8,
    flavorTags: ['Jasmine', 'Peach', 'Bergamot'],
    notes: 'Vibrant acidity that cooled into intense peach nectar and jasmine tea.',
    wouldBrewAgain: true,
    createdAt: new Date().toISOString(),
  },
];
