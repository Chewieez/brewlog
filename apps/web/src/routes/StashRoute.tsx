import React from 'react';
import { useNavigate } from 'react-router';
import { StashView } from '../features/stash/StashView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { Bean } from '@brewlog/core';

export const StashRoute: React.FC = () => {
  const { beans, onAddBean, setSelectedBean } = useRootOutletContext();
  const navigate = useNavigate();

  const handleSelectBeanForBrew = (bean: Bean) => {
    setSelectedBean(bean);
    navigate('/timer');
  };

  return (
    <StashView
      beans={beans}
      onAddBean={onAddBean}
      onSelectBeanForBrew={handleSelectBeanForBrew}
    />
  );
};
