import { Equipment, EquipmentType } from "@brewlog/core";
import { EquipmentRow, EquipmentInsert } from "../database.types";

export const mapEquipmentRowToDomain = (row: EquipmentRow): Equipment => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as EquipmentType,
  brand: row.brand,
  model: row.model,
  subType: row.sub_type || undefined,
  settingScaleType:
    (row.setting_scale_type as Equipment["settingScaleType"]) || undefined,
  isFavorite: row.is_favorite ?? false,
  notes: row.notes || undefined,
  createdAt: row.created_at,
});

export const mapEquipmentDomainToInsert = (
  item: Omit<Equipment, "id" | "createdAt">,
  userId: string
): EquipmentInsert => ({
  user_id: userId,
  type: item.type,
  brand: item.brand,
  model: item.model,
  sub_type: item.subType || null,
  setting_scale_type: item.settingScaleType || null,
  is_favorite: item.isFavorite || false,
  notes: item.notes || null,
});

