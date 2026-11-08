import React from 'react';
import { useNavigate } from 'react-router';
import { StashView } from '../features/stash/StashView';
import { useBeans } from '../features/stash/BeansContext';
import { Bean } from '@brewlog/core';

export const StashRoute: React.FC = () => {
  const { beans, addBean, updateBean, deleteBean, setSelectedBean } = useBeans();
  const navigate = useNavigate();

  const handleSelectBeanForBrew = (bean: Bean) => {
    setSelectedBean(bean);
    navigate('/timer');
  };

  const handleAddBean = async (bean: Bean) => {
    await addBean(bean);
  };

  const handleUpdateBean = async (bean: Bean) => {
    await updateBean(bean);
  };

  return (
    <StashView
      beans={beans}
      onAddBean={handleAddBean}
      onUpdateBean={handleUpdateBean}
      onDeleteBean={deleteBean}
      onSelectBeanForBrew={handleSelectBeanForBrew}
    />
  );
};
