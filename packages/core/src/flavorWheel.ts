import { FlavorWheelNode } from "./types";

export const SCA_FLAVOR_WHEEL: FlavorWheelNode[] = [
  {
    name: "Fruity",
    color: "#e11d48",
    subcategories: [
      {
        name: "Berry",
        color: "#f43f5e",
        descriptors: ["Blackberry", "Raspberry", "Blueberry", "Strawberry"],
      },
      {
        name: "Dried Fruit",
        color: "#be123c",
        descriptors: ["Raisin", "Prune", "Dried Fig", "Date"],
      },
      {
        name: "Citrus Fruit",
        color: "#fb923c",
        descriptors: ["Grapefruit", "Orange", "Lemon", "Lime", "Bergamot"],
      },
      {
        name: "Stone Fruit",
        color: "#f97316",
        descriptors: ["Peach", "Apricot", "Plum", "Cherry"],
      },
      {
        name: "Tropical Fruit",
        color: "#facc15",
        descriptors: ["Mango", "Pineapple", "Papaya", "Passion Fruit", "Guava"],
      },
    ],
  },
  {
    name: "Floral",
    color: "#ec4899",
    subcategories: [
      {
        name: "Floral",
        color: "#f472b6",
        descriptors: ["Jasmine", "Rose", "Orange Blossom", "Lavender", "Chamomile"],
      },
      {
        name: "Black Tea",
        color: "#db2777",
        descriptors: ["Earl Grey", "Black Tea", "Hibiscus"],
      },
    ],
  },
  {
    name: "Sweet",
    color: "#d97706",
    subcategories: [
      {
        name: "Brown Sugar",
        color: "#f59e0b",
        descriptors: ["Molasses", "Maple Syrup", "Caramel", "Honey", "Brown Sugar"],
      },
      {
        name: "Vanilla",
        color: "#fbbf24",
        descriptors: ["Vanilla Bean", "Marshmallow", "Nougat"],
      },
    ],
  },
  {
    name: "Nutty / Cocoa",
    color: "#92400e",
    subcategories: [
      {
        name: "Nutty",
        color: "#b45309",
        descriptors: ["Almond", "Hazelnut", "Pecan", "Walnut", "Peanut"],
      },
      {
        name: "Cocoa",
        color: "#78350f",
        descriptors: ["Dark Chocolate", "Milk Chocolate", "Cacao Nibs", "Cocoa Powder"],
      },
    ],
  },
  {
    name: "Spices",
    color: "#b91c1c",
    subcategories: [
      {
        name: "Sweet Spice",
        color: "#dc2626",
        descriptors: ["Cinnamon", "Clove", "Nutmeg", "Cardamom", "Anise"],
      },
      {
        name: "Pungent",
        color: "#991b1b",
        descriptors: ["Black Pepper", "Ginger", "Allspice"],
      },
    ],
  },
  {
    name: "Roasted",
    color: "#713f12",
    subcategories: [
      {
        name: "Cereal / Grain",
        color: "#854d0e",
        descriptors: ["Toasted Bread", "Malt", "Barley", "Graham Cracker"],
      },
      {
        name: "Smoky / Woody",
        color: "#582a0b",
        descriptors: ["Oak", "Cedar", "Pipe Tobacco", "Smoky"],
      },
    ],
  },
  {
    name: "Fermented / Sour",
    color: "#84cc16",
    subcategories: [
      {
        name: "Sour / Fermented",
        color: "#a3e635",
        descriptors: ["Winey", "Kombucha", "Cider", "Sour Cherry", "Lactic"],
      },
    ],
  },
];

export function getAllFlavorDescriptors(): string[] {
  const list: string[] = [];
  SCA_FLAVOR_WHEEL.forEach((category) => {
    category.subcategories?.forEach((sub) => {
      if (sub.descriptors) list.push(...sub.descriptors);
    });
  });
  return Array.from(new Set(list));
}
