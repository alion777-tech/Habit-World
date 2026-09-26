// types/appTypes.ts

export type DailyStat = {
  date: string;
  total: number;
  doneCount: number;
  rate: number;
};

export type PointHistoryItem = {
  date: string;   // "YYYY-MM-DD"
  point: number;  // +◯pt
};

export type Habit = {
  id: string;
  text: string;
  createdAt: Date | null;
  type: "daily" | "weekly";
  daysOfWeek?: number[]; // weekly のときだけ
  dailyStreak: number;
  lastCompletedDate: string | null;
  point: number | null;
  pointHistory: PointHistoryItem[];
};

export type Goal = {
  priorityOrder?: number;
  createdAt?: Date | string | { toDate: () => Date } | null;
  id: string;
  title: string;
  deadline?: string | null;
  done: boolean;
  achievedAt?: any; // Timestamp
};

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  memo?: string;
  createdAt?: Date | string | { toDate: () => Date } | null;
  completedAt?: string | null;
  priority?: "high" | "medium" | "low";
  startDate?: string | null;
  dueDate?: string | null;
  categoryId?: string | null;
  pinned?: boolean;
  reminderDays?: number | null;
  recurrence?: TodoRecurrence | null;
  subtasks?: { id: string; text: string; done: boolean }[];
  rewarded?: boolean;
  completionPoints?: number; // Actual reversible amount; absent on legacy ToDos.
  nextTodoId?: string | null;
};

export type TodoRecurrence = { unit: "day" | "week" | "month"; interval: number; weekday?: number; monthDay?: number | "last" };
export type TodoCategory = { id: string; name: string; shopping?: boolean };

export type UserProfile = {
  economy?: import("../lib/economyModel").Economy;
  publicGoals?: { id: string; title: string; deadline: string | null }[];
  fairyRoom?: import("@/lib/fairyRoomModel").FairyRoomState;
  fairy?: { status: "egg" | "naming" | "ready"; eggReceivedAt: string; bornAt?: string; name?: string; appearance: string };
  loginRewardDate?: string;
  specialPointHistory?: SpecialPointEntry[];
  todoPoints?: number;
  todoCategories?: TodoCategory[];
  uid: string;
  name: string;
  gender: string;
  dream: string;
  isPublic: boolean;
  showDream: boolean;
  showGoal: boolean;
  earnedTitles: string[];
  dreamAchievedCount?: number;
  bonusPoints?: number;
  lastLoginAt?: any; // Timestamp
  firstLoginAt?: any; // Timestamp
  totalPoints?: number;

  following?: string[]; // フォロー中のユーザーUID
  showLastLogin?: boolean;
  recentAction?: {
    type: "dream" | "goal";
    text: string;
    date: any; // Timestamp
  } | null;

  // 統計・称号用
  stats?: {
    loginDays?: number;
    continuousLoginDays?: number;
    maxContinuousLoginDays?: number;
    maxStreak?: number;
    goalsCreatedCount?: number;
    habitsCreatedCount?: number;
    goalsAchievedCount?: number;
    earnedHabitStreakBonuses?: number[];

    // 悪戯防止用
    lastActionDate?: string; // "YYYY-MM-DD"
    goalsAddedToday?: number;
    todosAddedToday?: number;
    habitsAddedToday?: number;
  };
};

export type SpecialPointEntry = {
  id: string;
  date: string | null;
  name: string;
  description: string;
  point: number;
};

export type BucketListItem = {
  id: number;       // 1-100
  text: string;
  deadline?: string | null;
  isCompleted: boolean;
};

export type BucketListData = {
  title: string;
  subtitle: string;
  targetDate?: string | null; // 全体の目標期限
  items: BucketListItem[];
};
