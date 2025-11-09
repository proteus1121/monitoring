import React, { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Api } from './api';

const ApiContext = createContext<Api | null>(null);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const onUnauthorized = () => {
    navigate('/auth/login');
  };

  const api = useMemo(() => {
    const instance = new Api(process.env.BASE_URL!, onUnauthorized);

    return instance;
  }, [navigate]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return api;
};
