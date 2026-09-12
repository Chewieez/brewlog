import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { StashView } from '../features/stash/StashView';
import { RootOutletContext } from '../layouts/RootLayout';
import { Bean } from '@brewlog/core';

export const StashRoute: React.FC = () => {
  const { beans, onAddBean, setSelectedBean } = useOutletContext<RootOutletContext>();
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
