export type LeaderboardEntry = {
  username: string;
  kills: number;
  deaths: number;
  xp: number;
  matches: number;
};

export type UserInfo = {
  username: string;
  isLoggedIn: boolean;
};
