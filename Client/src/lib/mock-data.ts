export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  votes: number;
  userVote?: number;
  replies?: Comment[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  votes: number;
  commentCount: number;
  timestamp: string;
  type?: 'text' | 'link' | 'image';
  url?: string;
  imageUrl?: string;
  comments: Comment[];
  userVote?: number;
  isSaved?: boolean;
}

export interface SubredditInfo {
  name: string;
  description: string;
  subscribers: string;
  online: number;
  icon: string;
  createdAt: string;
  type?: string;
  isMember?: boolean;
  isModerator?: boolean;
}

export interface Notification {
  _id: string;
  recipient: string;
  actor: {
    _id: string;
    username: string;
  };
  type: 'post_comment' | 'comment_reply' | 'mention' | 'community_invite';
  post?: {
    _id: string;
    title: string;
  };
  comment?: {
    _id: string;
    body: string;
  };
  community?: {
    _id: string;
    name: string;
  };
  isRead: boolean;
  createdAt: string;
}
