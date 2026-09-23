import { Bean, ProcessMethod, RoastLevel } from "@brewlog/core";
import { BeanRow, BeanInsert } from "../database.types";

export const mapBeanRowToDomain = (b: BeanRow): Bean => ({
  id: b.id,
  userId: b.user_id,
  roaster: b.roaster,
  name: b.name,
  originCountry: b.origin_country || undefined,
  region: b.region || undefined,
  farm: b.farm || undefined,
  variety: b.variety || [],
  altitudeMeters: b.altitude_meters || undefined,
  process: (b.process as ProcessMethod) || undefined,
  roastLevel: (b.roast_level as RoastLevel) || undefined,
  roastDate: b.roast_date || undefined,
  flavorNotes: b.flavor_notes || [],
  rating: b.rating ? Number(b.rating) : undefined,
  bagWeightGrams:
    b.bag_weight_grams !== null && b.bag_weight_grams !== undefined
      ? Number(b.bag_weight_grams)
      : undefined,
  bagWeightOz:
    b.bag_weight_grams !== null && b.bag_weight_grams !== undefined
      ? Number((Number(b.bag_weight_grams) / 28.3495).toFixed(1))
      : undefined,
  remainingGrams:
    b.remaining_grams !== null && b.remaining_grams !== undefined
      ? Number(b.remaining_grams)
      : undefined,
  price: b.price ? Number(b.price) : undefined,
  isFavorite: b.is_favorite,
  recommendedRestDays: b.recommended_rest_days ?? undefined,
  isFrozen: b.is_frozen ?? false,
  frozenDate: b.frozen_date || undefined,
  isArchived: b.is_archived ?? false,
  notes: b.notes || undefined,
  createdAt: b.created_at,
});

export const mapBeanDomainToInsert = (
  bean: Omit<Bean, "id" | "createdAt">,
  userId: string
): BeanInsert => ({
  user_id: userId,
  roaster: bean.roaster,
  name: bean.name,
  origin_country: bean.originCountry || null,
  region: bean.region || null,
  farm: bean.farm || null,
  variety: bean.variety || [],
  altitude_meters: bean.altitudeMeters || null,
  process: bean.process || null,
  roast_level: bean.roastLevel || null,
  roast_date: bean.roastDate || null,
  flavor_notes: bean.flavorNotes || [],
  bag_weight_grams: bean.bagWeightGrams ?? null,
  remaining_grams:
    bean.remainingGrams !== undefined
      ? bean.remainingGrams
      : (bean.bagWeightGrams ?? null),
  price: bean.price || null,
  is_favorite: bean.isFavorite || false,
  recommended_rest_days: bean.recommendedRestDays ?? null,
  is_frozen: bean.isFrozen ?? false,
  frozen_date: bean.frozenDate || null,
  is_archived: bean.isArchived ?? false,
  notes: bean.notes || null,
});
