import React from 'react';
import { useOutletContext } from 'react-router';
import { EquipmentView } from '../features/equipment/EquipmentView';
import { RootOutletContext } from '../layouts/RootLayout';

export const EquipmentRoute: React.FC = () => {
  const { equipment, onAddEquipment, onDeleteEquipment } = useOutletContext<RootOutletContext>();

  return (
    <EquipmentView
      equipment={equipment}
      onAddEquipment={onAddEquipment}
      onDeleteEquipment={onDeleteEquipment}
    />
  );
};
