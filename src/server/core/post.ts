import { reddit, context } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Tankies — Play Now! 💥',
    subredditName: context.subredditName,
  });
};
