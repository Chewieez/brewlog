import React from 'react';
import { EquipmentView } from '../features/equipment/EquipmentView';
import { useEquipment } from '../features/equipment/EquipmentContext';

export const EquipmentRoute: React.FC = () => {
  const {
    equipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    toggleFavorite,
  } = useEquipment();

  return (
    <EquipmentView
      equipment={equipment}
      onAddEquipment={addEquipment}
      onUpdateEquipment={updateEquipment}
      onDeleteEquipment={deleteEquipment}
      onToggleFavorite={toggleFavorite}
    />
  );
};
