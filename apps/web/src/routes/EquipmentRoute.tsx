import React from 'react';
import { EquipmentView } from '../features/equipment/EquipmentView';
import { useRootOutletContext } from '../layouts/RootLayout';

export const EquipmentRoute: React.FC = () => {
  const {
    equipment,
    onAddEquipment,
    onUpdateEquipment,
    onDeleteEquipment,
    onToggleFavorite,
  } = useRootOutletContext();

  return (
    <EquipmentView
      equipment={equipment}
      onAddEquipment={onAddEquipment}
      onUpdateEquipment={onUpdateEquipment}
      onDeleteEquipment={onDeleteEquipment}
      onToggleFavorite={onToggleFavorite}
    />
  );
};
