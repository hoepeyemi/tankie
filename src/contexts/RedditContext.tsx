import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserInfo, type UserInfo } from '@/lib/devvit-bridge';
import { usePlayerSettings } from '@/store/store';

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
  const { name, setName } = usePlayerSettings();

  useEffect(() => {
    getUserInfo()
      .then(userInfo => {
        setInfo(userInfo);
        // Auto-set the in-game display name to the Reddit username on first load.
        // Only overwrite if still at the default "Player" value so we don't clobber
        // a name the user explicitly chose.
        if (userInfo.isLoggedIn && userInfo.username && name === 'Player') {
          setName(userInfo.username);
        }
      })
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
