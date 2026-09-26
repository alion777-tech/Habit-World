//types/viewProps.ts
import type React from "react";
import type { DailyStat, Goal, Todo } from "@/types/appTypes";



export type DreamViewProps = {
  uid: string | null;

  profile: { name: string; avatar: string; dream: string };
  setProfile: React.Dispatch<
    React.SetStateAction<{ name: string; avatar: string; dream: string }>
  >;

  dreamInput: string;
  setDreamInput: React.Dispatch<React.SetStateAction<string>>;

  isEditingDream: boolean;
  setIsEditingDream: React.Dispatch<React.SetStateAction<boolean>>;

  goals: Goal[];

  goalInput: string;
  setGoalInput: React.Dispatch<React.SetStateAction<string>>;

  deadline: string;
  setDeadline: React.Dispatch<React.SetStateAction<string>>;

  editingGoalId: string | null;
  setEditingGoalId: React.Dispatch<React.SetStateAction<string | null>>;

  editingGoalText: string;
  setEditingGoalText: React.Dispatch<React.SetStateAction<string>>;

  tabButtonStyle: React.CSSProperties;
};

export type TodoViewProps = {
  uid: string | null;

  todos: Todo[];

  todoInput: string;
  setTodoInput: React.Dispatch<React.SetStateAction<string>>;

  editingTodoId: string | null;
  setEditingTodoId: React.Dispatch<React.SetStateAction<string | null>>;

  editingTodoText: string;
  setEditingTodoText: React.Dispatch<React.SetStateAction<string>>;
};
