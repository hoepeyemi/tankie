import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserInfo, type UserInfo } from '@/lib/devvit-bridge';

type RedditContextValue = {
  username: string;
  isLoggedIn: boolean;
  loading: boolean;
};

const RedditContext = createContext<RedditContextValue>({
  username: 'Player',
  isLoggedIn: false,
  loading: true,
});

export function RedditProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<UserInfo>({ username: 'Player', isLoggedIn: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserInfo()
      .then(setInfo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <RedditContext.Provider value={{ ...info, loading }}>
      {children}
    </RedditContext.Provider>
  );
}

export const useRedditUser = () => useContext(RedditContext);
