"use client";
import { afterPaint } from "@/lib/afterPaint";
import { syncEconomy } from "@/lib/economyActions";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { orderedHabits } from "@/lib/cardOrder";
import HabitView from "../components/HabitView";
import { TestAdminControls } from "../components/TestAdminMenu";
import { useTestAccess } from "@/hooks/useTestAccess";
import { habitTestDate } from "@/lib/habits/habitTestDate";
import FairyRoom from "../components/FairyRoom";
import FairyChamber from "../components/FairyChamber";
import { recordFairyLogin } from "@/lib/fairyProgressActions";
import AutonomousFairy from "../components/AutonomousFairy";
import { announceFairy } from "@/lib/fairy/events";
import {
  addHabit,
  deleteHabit as deleteHabitAction,
} from "@/lib/habitActions";
import { updateHabitFields, setHabitCompletion } from "@/lib/habits/updateHabitFields";
import { formatDateToJST } from "@/lib/habits/dateUtils";
import type { DailyStat, Habit, Goal, Todo, UserProfile, PointHistoryItem } from "@/types/appTypes";
import { isHabitVisibleOnDate } from "@/lib/habits/visibility";
import { useHabitCalendar } from "@/hooks/useHabitCalendar";
import StatsView from "../components/StatsView";
import AuthBox from "../components/AuthBox";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, saveUserProfile, updateLastLogin } from "@/lib/profileActions";
import { subscribeData, subscribeProfile } from "@/lib/dataPersistence";
import OpeningTutorial from "../components/OpeningTutorial";
import FairyChamberPreview from "../components/FairyChamberPreview";
import ProfileView from "../components/ProfileView";
import TodoView from "../components/TodoView";
import HomeView from "../components/HomeView";
import DreamView from "../components/DreamView";
import HistoryView from "../components/HistoryView";
import FriendView from "../components/FriendView";
import BucketListView from "../components/BucketListView";
import { deleteGoal as deleteGoalAction, syncPublicGoals } from "@/lib/goalActions";




import { awardSpecialPoints } from "@/lib/specialPointActions";
import { specialPointHistory } from "@/lib/specialPointModel";
import { TITLE_DEFINITIONS } from "@/lib/titles";
import { useTranslations, useLocale } from "next-intl";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

export default function Home() {
  const locale = useLocale();
  const isDev = process.env.NODE_ENV === "development";
  const t = useTranslations();
  const th = useTranslations("Habit");
  const tc = useTranslations("Common");
  const ta = useTranslations("Auth");
  const tp = useTranslations("Profile");
  const tg = useTranslations("Goal");
  const td = useTranslations("Dream");
  const ts = useTranslations("Stats");
  const tt = useTranslations("Tabs");

  const [openingVisible, setOpeningVisible] = useState(true);
  const [fairyError, setFairyError] = useState("");
  const [fairyRetry, setFairyRetry] = useState(0);
  const [habit, setHabit] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoadedFor, setHabitsLoadedFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [habitType, setHabitType] = useState<"daily" | "weekly">("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [isEditingDream, setIsEditingDream] = useState(false);
  const [dreamInput, setDreamInput] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [earnedTitles, setEarnedTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const playCharing = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  };
  const [profile, setProfile] = useState<UserProfile>({
    uid: "",
    name: "",
    gender: "",
    dream: "",
    isPublic: false,
    showDream: false,
    showGoal: false,
    earnedTitles: [],
      specialPointHistory: [],
      fairy: undefined,
    dreamAchievedCount: 0,
  });

  const {
    testDayOffset,
    setTestDayOffset,
    base,
    todayStr,
    yesterdayStr,
    todayDow,
    currentMonth,
    setCurrentMonth,
    calendarDays,
    dailyStats,
  } = useHabitCalendar(habits);

  // Keep speculative completion separate from reward/economy inputs.
  const [pendingHabit, setPendingHabit] = useState<{ uid: string | null; id: string; fields: Partial<Habit> } | null>(null);
  const displayHabits = pendingHabit?.uid === uid ? habits.map(h => h.id === pendingHabit.id ? { ...h, ...pendingHabit.fields } : h) : habits;
  const loginStatusRef = useRef<{ uid: string; lastLoginAt: UserProfile["lastLoginAt"] } | null>(null);
  const testAccess = useTestAccess();
  const canPreviewFairyRoom = !!uid && !isAnonymous && testAccess.uid === uid && !testAccess.loading && !!testAccess.label && testAccess.enabled;
  const [roomPreviewTime, setRoomPreviewTime] = useState<string | null>(null);
  useEffect(() => { if (!canPreviewFairyRoom) setRoomPreviewTime(null); }, [canPreviewFairyRoom, uid]);
  const habitDate = habitTestDate(todayStr, uid, testAccess);
  const [testDateBusy, setTestDateBusy] = useState(false);
  const [habitBusy, setHabitBusy] = useState(false);
  const habitLock = useRef(false);
  const [habitError, setHabitError] = useState("");
  const habitUnavailable = testDateBusy || habitBusy || (!!uid && (testAccess.uid !== uid || testAccess.loading))
    || habitsLoadedFor !== (uid || "local");



  // 🔄 全情報のクリア (ログアウト時などに使用)
  const resetAllData = () => {
    setProfile({
      uid: "",
      name: "",
      gender: "",
      dream: "",
      isPublic: false,
      showDream: false,
      showGoal: false,
      earnedTitles: [],
      specialPointHistory: [],
      fairy: undefined,
      dreamAchievedCount: 0,
    });
    setHabits([]);
    setGoals([]);
    setTodos([]);
    setEarnedTitles([]);
    setDreamInput("");
    setGoalInput("");
    setIsLoading(false);
  };

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid, "public", "status"), snapshot => {
      if (auth.currentUser?.uid !== uid) return;
      const lastLoginAt = snapshot.data()?.lastLoginAt;
      if (lastLoginAt !== undefined) {
        loginStatusRef.current = { uid, lastLoginAt };
        setProfile(p => p.uid === uid ? { ...p, lastLoginAt } : p);
      }
    }, error => console.error("[LoginStatus]", error));
  }, [uid]);

  // 👤 プロフィールのリアルタイム監視
  useEffect(() => {
    console.log("[ProfileSync] starting subscription for uid:", uid);
    setIsLoading(true);

    const unsub = subscribeProfile(uid, async (data) => {
      try {
        if (data) {
          let lastLoginAt = data.lastLoginAt;
          if (uid && loginStatusRef.current?.uid === uid) lastLoginAt = loginStatusRef.current.lastLoginAt ?? lastLoginAt;

          const p: UserProfile = {
            ...data,
            specialPointHistory: data.specialPointHistory ?? [],
            fairy: data.fairy,
            fairyRoom: data.fairyRoom,
            loginRewardDate: data.loginRewardDate,
            todoPoints: Number(data.todoPoints || 0),
            todoCategories: data.todoCategories,
            uid: uid || "local",
            name: data.name ?? "",
            gender: data.gender ?? "",
            dream: data.dream ?? data.dreams ?? "",
            isPublic: !!data.isPublic,
            showDream: !!data.showDream || !!data.showDreams,
            showGoal: typeof data.showGoal === "boolean" ? data.showGoal : !!data.showGoals,
            earnedTitles: Array.isArray(data.earnedTitles) ? data.earnedTitles : [],
            dreamAchievedCount: data.dreamAchievedCount ?? 0,
            lastLoginAt: lastLoginAt ?? null,
          };

          setProfile(prev => {
            const merged = { ...prev, ...p };
            if (p.name === "" && prev.name !== "") merged.name = prev.name;
            if (p.gender === "" && prev.gender !== "") merged.gender = prev.gender;
            return merged;
          });
          setEarnedTitles(p.earnedTitles);
        } else {
          setProfile(prev => ({ ...prev, todoPoints: 0, todoCategories: undefined }));
          if (uid) {
            const p = await getUserProfile(uid);
            if (p) {
              setProfile(p);
              setEarnedTitles(p.earnedTitles);
            }
          }
        }
      } catch (e) {
        console.error("[ProfileSync] Error processing:", e);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, [uid]);





  useEffect(() => {
    const unsub = subscribeData<Goal>("goals", uid, (list) => {
      const formatted = list.map((d: any) => ({
        ...d,
        id: d.id,
        title: d.title ?? "",
        deadline: d.deadline ?? null,
        done: !!d.done,
      }));
      setGoals(formatted);

    });

    return () => unsub();
  }, [uid]);




  useEffect(() => {
    if (uid) void syncPublicGoals(uid).catch(error => console.error("[PublicGoals] Sync failed", error));
  }, [uid]);

  // handleAddHabit moved below with limit check

  useEffect(() => {
    const unsub = subscribeData<Todo>("todos", uid, (list) => {
      const formatted = list.map(d => ({ ...d, text: d.text ?? "", done: !!d.done }));
      setTodos(formatted);
    });

    return () => unsub();
  }, [uid]);




  // titles are now imported from lib/titles as TITLE_DEFINITIONS

  // 🧭 画面切り替え用
  const [view, setView] = useState<
    "home" | "habit" | "history" | "stats" | "dream" | "todo" | "title" | "profile" | "friend" | "bucketList" | "fairyRoom"
  >("home");
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [view]);

  // 📅 カレンダー用
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tryFairyRoom, setTryFairyRoom] = useState(false);

  // 習慣表示用の日付 (今日 or 昨日)
  const [habitDisplayDate, setHabitDisplayDate] = useState<"today" | "yesterday">("today");
  const activeHabitDate = habitDisplayDate === "today" ? habitDate.today : habitDate.yesterday;
  const activeHabitDow = habitDisplayDate === "today" ? habitDate.dayOfWeek : (habitDate.dayOfWeek + 6) % 7;

  // 初回読み込み時にローカルストレージからダークモード設定を取得
  useEffect(() => {
    const saved = localStorage.getItem("isDarkMode");
    if (saved === "true") setIsDarkMode(true);
  }, []);

  // 設定変更時に保存
  const toggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    localStorage.setItem("isDarkMode", String(newVal));
  };

  // 夢達成長押し用
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const startLongPress = () => {
    setIsPressing(true);
    const timer = setTimeout(() => {
      handleDreamAchieved();
      setIsPressing(false);
    }, 10000); // 10秒
    setPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    setPressTimer(null);
    setIsPressing(false);
  };

  const handleDreamAchieved = async () => {
    if (!uid || !profile.dream) return;

    // 回数制限チェック
    if ((profile.dreamAchievedCount || 0) >= 5) {
      alert(td("limitReach"));
      return;
    }

    if (!window.confirm(td("achievedConfirm"))) return;

    const res = window.confirm(t("Dream.congratsMessage"));

    if (res) {
      // 目標維持
      if (window.confirm(t("Dream.maintainConfirm"))) {
        await saveUserProfile(uid, {
          dream: "",
          dreamAchievedCount: (profile.dreamAchievedCount || 0) + 1,
        });
        const { updateRecentAction } = await import("@/lib/socialActions");
        await updateRecentAction(uid, profile.dream, "dream");
        announceFairy("dreamAchieved");
      }
    } else {
      // 目標リセット
      if (window.confirm(t("Dream.resetConfirm"))) {
        // 目標をすべて削除
        const goalPromises = goals.map(g => deleteGoalAction(uid, g.id));
        await Promise.all(goalPromises);
        await saveUserProfile(uid, {
          dream: "",
          dreamAchievedCount: (profile.dreamAchievedCount || 0) + 1,
        });
        const { updateRecentAction } = await import("@/lib/socialActions");
        await updateRecentAction(uid, profile.dream, "dream");
        announceFairy("dreamAchieved");
      }
    }
  };


  // タブボタン共通スタイル
  const tabButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    fontWeight: 600,
    cursor: "pointer",
  };



  //（起動時1回）
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("[Auth] User logged in:", user.uid, user.isAnonymous ? "(Anonymous)" : "(Permanent)");
        setUid(user.uid);
        setIsAnonymous(user.isAnonymous);
        updateLastLogin(user.uid); // 最終ログイン更新
      } else {
        console.log("[Auth] No user found.");
        setUid(null);
        setIsAnonymous(false);
        setIsLoading(false);
      }
    });
  }, []);





  // 🔹 初回読み込み（Firestore / LocalStorage → 画面）
  useEffect(() => {
    const unsub = subscribeData<any>("habits", uid, (list) => {
      const formatted = list.map((doc) => {
        const data = doc;

        let createdAt: Date | null = null;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate(); // Firestore Timestamp
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt; // JS Date
          }
        }

        return {
          id: doc.id,
          text: data.text,
          priorityOrder: typeof data.priorityOrder === "number" ? data.priorityOrder : undefined,
          createdAt,
          type: data.type ?? "daily",
          daysOfWeek: data.daysOfWeek ?? undefined,
          dailyStreak: data.dailyStreak ?? 0,
          lastCompletedDate: data.lastCompletedDate ?? null,
          point: typeof data.point === "number" ? data.point : 0,
          pointHistory: Array.isArray(data.pointHistory)
            ? (data.pointHistory
              .filter((p: any) => p && typeof p.date === "string" && typeof p.point === "number")
              .map((p: any) => ({ date: p.date, point: p.point })) as PointHistoryItem[])
            : [],
        };
      });

      setHabits(formatted);
      setHabitsLoadedFor(uid || "local");
    });

    return () => unsub();
  }, [uid]);


  const saveEdit = async (id: string) => {
    if (!editingText.trim()) return;

    await updateHabitFields(uid, id, { text: editingText });

    setEditingId(null);
    setEditingText("");
  };

  const handleToggleHabit = async (habitId: string, date = activeHabitDate) => {
    if (habitUnavailable || habitLock.current || auth.currentUser?.uid !== (uid ?? undefined)) return;
    const h = habits.find(h => h.id === habitId);
    if (!h) return;
    habitLock.current = true; setHabitBusy(true); setHabitError("");
    try {
      // Presentation only: never pass this provisional history to persistence or rewards.
      const history = h.pointHistory ?? [];
      const wasDone = history.some(entry => entry.date === date);
      setPendingHabit({ uid, id: h.id, fields: { pointHistory: wasDone
        ? history.filter(entry => entry.date !== date)
        : [...history, { date, point: 0 }] } });
      await afterPaint();
      if (auth.currentUser?.uid !== (uid ?? undefined)) return;
      const result = await setHabitCompletion(uid, h.id, date, !wasDone, habitDate.context);
      if (!result) return;
      if (auth.currentUser?.uid !== (uid ?? undefined)) return;

      setHabits(list => list.map(item => item.id === h.id ? { ...item, ...result.fields } : item));
      setPendingHabit(null);
      if (result.kind === "check") {
        const first = habits.every(item => item.pointHistory.length === 0);
        const days = result.fields.dailyStreak;
        const newLevel = Math.floor((totalPoint + result.pointDelta) / 100) + 1;
        announceFairy(first ? "firstHabit" : date === habitDate.today && days === 30 ? "streak30"
          : date === habitDate.today && days === 7 ? "streak7"
          : newLevel > level ? "levelUp" : "habitCompleted");
      }

      if (result.alertMessage) alert(result.alertMessage);
    } catch (error) {
      if (auth.currentUser?.uid !== (uid ?? undefined)) return;
      setHabitError(error instanceof Error ? error.message : "保存できませんでした。再試行してください。");
    } finally { setPendingHabit(null); habitLock.current = false; setHabitBusy(false); }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!window.confirm(th("confirmDelete"))) return;
    try {
      await deleteHabitAction(uid, id);
    } catch (e) {
      console.error("削除エラー", e);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      alert(tp("enterName"));
      return;
    }
    if (!profile.gender || (profile.gender !== "male" && profile.gender !== "female")) {
      alert(tp("selectGender"));
      return;
    }
    try {
      const updateData = {
        name: profile.name.trim(),
        gender: profile.gender || "other",
        isPublic: !!profile.isPublic,
        showDream: !!profile.showDream,
        showGoal: !!profile.showGoal,
        showLastLogin: !!profile.showLastLogin,
      };
      await saveUserProfile(uid, updateData);
      alert(tp("saveSuccess"));
    } catch (e) {
      console.error("[ProfileSave] failed:", e);
      alert(tp("saveError"));
    }
  };



  // 累計獲得ポイント計算
  // 1. 習慣の獲得ポイント
  const habitPoints = habits.reduce((sum, h) => sum + (h.point ?? 0), 0);

  // 2. 目標達成ボーナス (達成数 × 100pt) - リアルタイムな goals 配列から計算
  const goalBonusPoints = goals.filter(g => g.done).length * 100;
  // const goalBonusPoints = (Number(profile.stats?.goalsAchievedCount) || 0) * 100;

  // 3. 過去の残高を引き継ぐ特別ポイント（履歴は表示用で、再加算しない）
  const titleBonusPoints = Number(profile.bonusPoints || 0);

  // 合計
  const legacyPoint = habitPoints + goalBonusPoints + titleBonusPoints + (profile.todoPoints || 0);
  const totalPoint = profile.economy?.lifetimePoints ?? legacyPoint;
  const gold = profile.economy?.gold ?? 0;
  const [economyError, setEconomyError] = useState("");
  useEffect(() => {
    if (isLoading || (uid && profile.uid !== uid)) return;
    let active = true;
    void syncEconomy(uid).then(() => { if (active) setEconomyError(""); }).catch(() => { if (active) setEconomyError("ゴールドを同期できません。接続を確認して再読み込みしてください。"); });
    return () => { active = false; };
  }, [uid, profile.uid, isLoading, legacyPoint]);
  // const totalPoint = habits.reduce((sum, h) => sum + (h.point ?? 0), 0) + Number(profile.bonusPoints || 0);

  const level = Math.max(profile.economy?.highestLevel ?? 1, Math.floor(totalPoint / 100) + 1);

  // 達成判定を再実行しても、加算と履歴保存はトランザクションで一度だけ。
  useEffect(() => {
    if (!uid || isLoading || !profile.economy) return;
    const stats = {
      ...profile.stats,
      firstLoginAt: profile.firstLoginAt,
      totalPoints: totalPoint,
      highestLevel: profile.economy?.highestLevel ?? 1,
      habitsCreatedCount: Math.max(profile.stats?.habitsCreatedCount || 0, habits.length),
      goalsCreatedCount: Math.max(profile.stats?.goalsCreatedCount || 0, goals.length),
    };
    // 未達成の条件がなければ書き込み・トランザクションを行わない。
    if (!TITLE_DEFINITIONS.some(item => !earnedTitles.includes(item.id) && item.check(stats))) return;
    void awardSpecialPoints(uid, stats).then(({ added }) => {
      if (!added.length || auth.currentUser?.uid !== uid) return;
      playCharing();
      alert(added.map(item => `🎉 特別ポイント獲得！\n「${item.name}」\n${item.description}\n＋${item.point} pt`).join("\n\n"));
    }).catch(error => console.error("[SpecialPoints] 保存失敗", error));
  }, [uid, isLoading, profile.stats, profile.firstLoginAt, totalPoint, profile.economy?.lifetimePoints, profile.economy?.highestLevel, habits.length, goals.length, earnedTitles]);

  // 🔹 利用制限チェック用
  const checkLimit = (type: "goals" | "todos" | "habits") => {
    const today = formatDateToJST(new Date());
    const s = profile.stats || {};
    const isNewDay = s.lastActionDate !== today;

    // 累計上限
    if (type === "goals" && goals.length >= 200) {
      alert(tg("limitReach"));
      return false;
    }
    if (type === "todos" && todos.length >= 200) {
      alert(t("Todo.limitReach")); // Will add this
      return false;
    }
    if (type === "habits" && habits.length >= 50) {
      alert(th("limitReach"));
      return false;
    }

    // 1日の上限
    const dailyCount = isNewDay ? 0 : (
      type === "goals" ? (s.goalsAddedToday || 0) :
        type === "todos" ? (s.todosAddedToday || 0) :
          (s.habitsAddedToday || 0)
    );

    if (dailyCount >= 50) {
      alert(t("Common.dailyLimitReach")); // I should add this to messages
      return false;
    }
    return true;
  };

  // 🔹 統計更新ヘルパー
  const incrementStats = async (type: "goals" | "todos" | "habits") => {
    const today = formatDateToJST(new Date());
    const s = profile.stats || {};
    const isNewDay = s.lastActionDate !== today;

    const newStats = {
      ...s,
      lastActionDate: today,
      goalsAddedToday: isNewDay ? (type === "goals" ? 1 : 0) : (s.goalsAddedToday || 0) + (type === "goals" ? 1 : 0),
      todosAddedToday: isNewDay ? (type === "todos" ? 1 : 0) : (s.todosAddedToday || 0) + (type === "todos" ? 1 : 0),
      habitsAddedToday: isNewDay ? (type === "habits" ? 1 : 0) : (s.habitsAddedToday || 0) + (type === "habits" ? 1 : 0),
      goalsCreatedCount: (s.goalsCreatedCount || 0) + (type === "goals" ? 1 : 0),
      habitsCreatedCount: (s.habitsCreatedCount || 0) + (type === "habits" ? 1 : 0),
    };

    await saveUserProfile(uid, { stats: newStats });
  };

  const handleAddHabit = async () => {
    if (!checkLimit("habits")) return;

    await addHabit(uid, habit, habitType, daysOfWeek);
    await incrementStats("habits");

    setHabit("");
    setHabitType("daily");
    setDaysOfWeek([]);
  };


  const streak = (() => {
    let count = 0;
    for (const d of dailyStats) {
      if (d.rate === 100) count++;
      else break;
    }
    return count;
  })();

  // 日付は実際の日本時間。テスト用の日付オフセットは報酬判定に渡さない。
  useEffect(() => {
    if (isLoading || !uid || isAnonymous) return;
    let cancelled = false;
    const run = async () => {
      try {
        await recordFairyLogin(uid);
        if (!cancelled) setFairyError("");
      } catch { if (!cancelled) setFairyError("ログイン記録を保存できませんでした。通信を確認して再試行してください。"); }
    };
    void run();
    return () => { cancelled = true; };
  }, [uid, isAnonymous, isLoading, todayStr, profile.fairy?.status, fairyRetry]);

  const visibleHabits = orderedHabits(displayHabits, activeHabitDate)
    .filter(h => {
      if (h.type === "daily") return true;
      if (h.type === "weekly" && h.daysOfWeek?.includes(activeHabitDow)) return true;
      return false;
    })
    .sort((a, b) => {
      const aDone = (a.pointHistory ?? []).some(p => p.date === activeHabitDate);
      const bDone = (b.pointHistory ?? []).some(p => p.date === activeHabitDate);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1; // 未達成(false)を前に、達成済み(true)を後に
    });



  return (

    <main className="app-shell" style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "20px 10px",
      background: isDarkMode ? "#111827" : "#f5f5f5",
      color: isDarkMode ? "#f3f4f6" : "#000",
      fontFamily: "sans-serif",
      transition: "background 0.3s, color 0.3s"
    }}>


      <OpeningTutorial uid={uid} onActiveChange={setOpeningVisible} signedIn={!!uid && !isAnonymous} ready={!isLoading && habitsLoadedFor === (uid || "local")} onNavigate={setView} />
      {!openingVisible && !isLoading && uid && profile.uid === uid && profile.fairy?.status === "naming" && <FairyRoom key={`birth-${uid}`} uid={uid} fairy={profile.fairy} hatching />}
      <div className="app-panel" style={{
        width: 360,
        maxWidth: view === "fairyRoom" ? 1100 : 560,
        background: isDarkMode ? "rgba(31, 41, 55, 0.92)" : "rgba(255, 255, 255, 0.88)",
        borderRadius: 12,
        padding: 24,
        boxShadow: isDarkMode ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.1)",
        transition: "background 0.3s"
      }}>
        <div ref={contentRef} className="app-content">
        {!openingVisible && !isLoading && view !== "fairyRoom" && profile.uid === uid && profile.fairy?.status === "ready" && <AutonomousFairy onOpenRoom={() => setView("fairyRoom")} uid={uid} key={`fairy-${uid || "local"}`} context={{
          account: uid || "local", ready: !isLoading && habitsLoadedFor === (uid || "local"),
          total: habits.filter(h => h.type === "daily" || h.daysOfWeek?.includes(todayDow)).length,
          completed: habits.filter(h => (h.type === "daily" || h.daysOfWeek?.includes(todayDow)) && h.pointHistory.some(p => p.date === todayStr)).length,
          streak: Math.max(0, ...habits.filter(h => h.lastCompletedDate === todayStr || h.lastCompletedDate === yesterdayStr).map(h => h.dailyStreak)),
        }} />}
        {fairyError && <p role="alert">{fairyError}<button onClick={() => setFairyRetry(v => v + 1)}>再試行</button></p>}
        <details className="app-menu"><summary><span>☰ {locale === "ja" ? "メニュー" : "Menu"}</span><time className="menu-today" dateTime={todayStr} suppressHydrationWarning>{locale === "ja" ? `${todayStr.slice(0, 4)}年${Number(todayStr.slice(5, 7))}月${Number(todayStr.slice(8, 10))}日` : todayStr}</time></summary>
        <div data-opening="login"><AuthBox isDarkMode={isDarkMode} /></div>
        <TestAdminControls locale={locale} access={testAccess} disabled={habitBusy || testDateBusy} onBusyChange={setTestDateBusy}
          roomPreviewTime={roomPreviewTime} onRoomPreviewTimeChange={setRoomPreviewTime} />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={() => window.dispatchEvent(new Event("habit-world-replay-opening"))} style={{ padding: "10px 14px", border: "1px solid #94a3b8", borderRadius: 8, cursor: "pointer" }}>オープニングをもう一度見る</button>
          <button type="button" onClick={toggleDarkMode} aria-pressed={isDarkMode} aria-label={locale === "ja" ? "ダークモード" : "Dark mode"} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #94a3b8", cursor: "pointer", fontSize: 13 }}>
            {isDarkMode ? "☀️" : "🌙"} {locale === "ja" ? (isDarkMode ? "ライトモードに切替" : "ダークモードに切替") : (isDarkMode ? "Light mode" : "Dark mode")}
          </button>
        </div>



        {uid === null && !isLoading && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ fontSize: 13, color: isDarkMode ? "#9ca3af" : "#666" }}>
              {ta("loginMessage")}
            </p>
          </div>
        )}

        {/* ユーザープロフィール概要 (AuthBoxのすぐ下、装飾を抑えたデザイン) */}
        {!isLoading && (profile.name || profile.dream) && (
          <div style={{ marginBottom: 16 }}>
            {profile.name && (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  color: isDarkMode ? "#fff" : "#000",
                }}
              >
                <span style={{
                  color: profile.gender === "female" ? "#f472b6" : profile.gender === "male" ? "#3b82f6" : (isDarkMode ? "#9ca3af" : "#000"),
                  fontSize: "1.2em"
                }}>
                  {profile.gender === "female" ? "👩" : profile.gender === "male" ? "👨" : "👤"}
                </span>
                {profile.name}
                {profile.dreamAchievedCount && profile.dreamAchievedCount > 0 ? (
                  <span style={{
                    fontSize: 11,
                    color: isDarkMode ? "#fbbf24" : "#d97706",
                    background: isDarkMode ? "#451a03" : "#fffbeb",
                    padding: "2px 8px",
                    borderRadius: 20,
                    border: isDarkMode ? "1px solid #92400e" : "1px solid #fcd34d",
                    fontWeight: "bold"
                  }}>
                    ✨ {td("achievedCount", { count: profile.dreamAchievedCount })}
                  </span>
                ) : null}
              </div>
            )}

            {profile.dream && (
              <div
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                style={{
                  padding: "6px 12px",
                  background: isPressing
                    ? (isDarkMode ? "#064e3b" : "#dcfce7")
                    : (isDarkMode ? "#1e1b4b" : "#eef2ff"),
                  borderRadius: 8,
                  fontWeight: "bold",
                  fontSize: 13,
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.3s",
                  border: isPressing
                    ? `2px solid ${isDarkMode ? "#22c55e" : "#22c55e"}`
                    : `1px solid ${isDarkMode ? "#4338ca" : "#c7d2fe"}`,
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
                  color: isDarkMode ? "#fff" : "#1e40af"
                }}
              >
                {isPressing && (
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: 4,
                    background: "#22c55e",
                    width: "100%",
                    animation: "progress 10s linear"
                  }} />
                )}
                🌈 夢：{profile.dream}
                {isPressing && <div style={{ fontSize: 10, color: isDarkMode ? "#86efac" : "#166534", marginTop: 4 }}>そのまま10秒キープで達成！</div>}
              </div>
            )}
          </div>
        )}

        <style jsx>{`
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>

        {/* 環境表示インジケーター */}
        <div
          style={{
            fontSize: 10,
            padding: "6px 8px",
            marginBottom: 12,
            borderRadius: 6,
            background: isDarkMode
              ? (isDev ? "#451a03" : "#064e3b")
              : (isDev ? "#fef3c7" : "#d1fae5"),
            color: isDarkMode
              ? (isDev ? "#fbbf24" : "#6ee7b7")
              : (isDev ? "#92400e" : "#065f46"),
            textAlign: "center",
            border: isDarkMode
              ? `1px solid ${isDev ? "#92400e" : "#065f46"}`
              : "none"
          }}
        >
          {isDev ? "🔧 開発環境" : "🚀 本番環境"} | Project: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
        </div>

        {/* ===== ナビゲーションボタン (Loading外に出して安定させる) ===== */}
        <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {[
                { id: "habit", label: tt("habit"), icon: "🔥" },
                { id: "dream", label: tt("dream"), icon: "🌈" },
                { id: "todo", label: tt("todo"), icon: "📝" },
                { id: "bucketList", label: tt("bucketList"), icon: "💯" },
              ].map((btn) => {
                const isLocked = btn.id === "bucketList" && goals.filter(g => g.done).length < 30;
                return (
                  <button
                    key={btn.id}
                    onClick={() => !isLocked && setView(btn.id as any)}
                    style={{
                      flex: 1,
                      padding: "10px 4px",
                      background: isLocked
                        ? (isDarkMode ? "#374151" : "#d1d5db")
                        : (view === btn.id ? "#4f46e5" : (isDarkMode ? "transparent" : "#e5e7eb")),
                      color: isLocked
                        ? (isDarkMode ? "#9ca3af" : "#6b7280")
                        : (view === btn.id ? "#fff" : (isDarkMode ? "#fff" : "#374151")),
                      border: view === btn.id ? "none" : (isDarkMode ? "1.5px solid #fff" : "none"),
                      borderRadius: 8,
                      fontWeight: "bold",
                      fontSize: 13,
                      cursor: isLocked ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: isLocked ? 0.6 : 1,
                    }}
                    disabled={isLocked}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {[
                { id: "history", label: tt("history"), icon: "📈" },
                { id: "stats", label: tt("stats"), icon: "📊" },
                { id: "fairyRoom", label: locale === "ja" ? "妖精の部屋" : "Fairy room", icon: "🧚" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setView(btn.id as any)}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    background: view === btn.id ? "#4f46e5" : (isDarkMode ? "transparent" : "#e5e7eb"),
                    color: view === btn.id ? "#fff" : (isDarkMode ? "#fff" : "#374151"),
                    border: view === btn.id ? "none" : (isDarkMode ? "1.5px solid #fff" : "none"),
                    borderRadius: 8,
                    fontWeight: "bold",
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {btn.label}
                </button>
              ))}
              <button
                onClick={() => window.open("https://zinseigame.blogspot.com/2026/02/10-check-httpsdream-lan.html")}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: isDarkMode ? "transparent" : "#e5e7eb",
                  color: isDarkMode ? "#fff" : "#374151",
                  border: isDarkMode ? "1.5px solid #fff" : "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tt("usage")}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setView("profile")}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: view === "profile" ? "#4f46e5" : (isDarkMode ? "transparent" : "#e5e7eb"),
                  color: view === "profile" ? "#fff" : (isDarkMode ? "#fff" : "#374151"),
                  border: view === "profile" ? "none" : (isDarkMode ? "1.5px solid #fff" : "none"),
                  borderRadius: 8,
                  fontWeight: "bold",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                👤 {tt("profile")}
              </button>
              <button
                onClick={() => uid && setView("friend")}
                disabled={!uid}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: !uid
                    ? (isDarkMode ? "#374151" : "#d1d5db")
                    : (view === "friend" ? "#4f46e5" : (isDarkMode ? "transparent" : "#e5e7eb")),
                  color: !uid
                    ? (isDarkMode ? "#9ca3af" : "#6b7280")
                    : (view === "friend" ? "#fff" : (isDarkMode ? "#fff" : "#374151")),
                  border: view === "friend" ? "none" : (isDarkMode ? "1.5px solid #fff" : "none"),
                  borderRadius: 8,
                  fontWeight: "bold",
                  fontSize: 13,
                  cursor: !uid ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: !uid ? 0.6 : 1,
                }}
              >
                🤝 {tt("friend")}
              </button>
              <LanguageSwitcher isDarkMode={isDarkMode} />
            </div>
            <div style={{
              fontSize: 14,
              marginBottom: 16,
              color: isDarkMode ? "#fbbf24" : "#444",
              fontWeight: "bold"
            }}>
              🏆 累計獲得ポイント {totalPoint.toLocaleString()} pt · 🪙 {gold.toLocaleString()} ゴールド
            </div>
          </>

        </details>
        <p style={{ margin: "12px 0", fontSize: 13 }}>🏆 累計獲得ポイント {totalPoint.toLocaleString()} pt · 🪙 {gold.toLocaleString()} ゴールド</p>
        {economyError && <p role="alert">{economyError}</p>}
        {isLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "#6366f1", fontWeight: "bold" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
            {tc("loading")}
          </div>
        )}

        {view === "fairyRoom" && (isLoading ? <p role="status">お部屋を準備しています…</p> : <>
          {canPreviewFairyRoom && profile.uid === uid && profile.fairy?.status === "ready" && <button type="button" onClick={() => setTryFairyRoom(value => !value)} style={{ padding: "10px 14px", marginBottom: 12, border: "1px solid #94a3b8", borderRadius: 10, cursor: "pointer" }}>{tryFairyRoom ? "自分の妖精の部屋に戻る" : "サンプルの妖精で試す"}</button>}
          {!(canPreviewFairyRoom && tryFairyRoom) && uid && !isAnonymous && profile.uid === uid && profile.fairy?.status === "ready"
            ? <FairyChamber key={`room-${uid}`} uid={uid} fairy={profile.fairy} room={profile.fairyRoom ? { ...profile.fairyRoom, gold } : undefined} totalPoints={totalPoint} attainedLevel={level} loginDays={profile.stats?.loginDays ?? 0} previewTime={canPreviewFairyRoom ? roomPreviewTime : null} />
            : canPreviewFairyRoom ? <FairyChamberPreview key={`trial-${uid}`} embedded isDarkMode={isDarkMode} previewTime={roomPreviewTime} />
            : <section aria-label="妖精の部屋（未解放）" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 48 }} aria-hidden="true">🥚</div>
                <h2>妖精の部屋はまだ解放されていません</h2>
                <p>7日連続ログインで卵が孵化し、妖精に名前をつけると部屋が解放されます。</p>
                {uid && !isAnonymous && profile.uid === uid
                  ? <p>連続ログイン：{Math.min(7, profile.stats?.continuousLoginDays ?? 0)} / 7日{profile.fairy?.status === "naming" ? " · 妖精に名前をつけてください" : ""}</p>
                  : <p>Googleアカウントでログインして卵を育てましょう。</p>}
                <div style={{ display: "flex", gap: 12, justifyContent: "center", opacity: 0.5 }}>
                  <button disabled>🔒 妖精の部屋</button><button disabled>🔒 クローゼット</button><button disabled>🔒 着せ替え</button>
                </div>
              </section>}
        </>)}
        {(view === "habit" || view === "home") && habitDate.context && <p role="status">習慣テスト日付：{habitDate.today}（ToDo・妖精・冒険・ログインは実日付のまま）</p>}
        {(view === "habit" || view === "home") && habitError && <p role="alert">{habitError}</p>}
        {view === "home" && <HomeView key={`home-${uid || "local"}`} uid={uid} todos={todos} goals={goals} habits={displayHabits} today={todayStr} habitToday={habitDate.today} habitDisabled={habitUnavailable} isDarkMode={isDarkMode} onTodo={() => setView("todo")} onHabit={() => setView("habit")} onToggleHabit={id => handleToggleHabit(id, habitDate.today)} />}

        {view === "habit" && (
          <HabitView
            habit={habit}
            setHabit={(v) => setHabit(v)}
            onAddHabit={handleAddHabit}
            isDev={isDev}
            todayStr={activeHabitDate}
            setTestDayOffset={setTestDayOffset}
            habitType={habitType}
            setHabitType={setHabitType}
            daysOfWeek={daysOfWeek}
            setDaysOfWeek={setDaysOfWeek}
            uid={uid}
            visibleHabits={visibleHabits}
            allHabits={displayHabits}
            editingId={editingId}
            setEditingId={setEditingId}
            editingText={editingText}
            setEditingText={setEditingText}
            completionDisabled={habitUnavailable}
            onToggleHabit={id => handleToggleHabit(id)}
            onSaveEdit={saveEdit}
            onDeleteHabit={handleDeleteHabit}
            isDarkMode={isDarkMode}
            habitDisplayDate={habitDisplayDate}
            setHabitDisplayDate={setHabitDisplayDate}
          />
        )}

        {view === "history" && (
          <HistoryView
            specialPoints={specialPointHistory(profile, TITLE_DEFINITIONS)}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            calendarDays={calendarDays}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            habits={habits}
            isDarkMode={isDarkMode}
          />
        )}

        {view === "stats" && (
          <StatsView
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            calendarDays={calendarDays}
            dailyStats={dailyStats}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            streak={streak}
            isDarkMode={isDarkMode}
          />
        )}

        {view === "dream" && (
          <DreamView
            uid={uid}
            profile={profile}
            setProfile={setProfile}
            dreamInput={dreamInput}
            setDreamInput={setDreamInput}
            isEditingDream={isEditingDream}
            setIsEditingDream={setIsEditingDream}
            goals={goals}
            goalInput={goalInput}
            setGoalInput={setGoalInput}
            deadline={deadline}
            setDeadline={setDeadline}
            editingGoalId={editingGoalId}
            setEditingGoalId={setEditingGoalId}
            editingGoalText={editingGoalText}
            setEditingGoalText={setEditingGoalText}
            tabButtonStyle={tabButtonStyle}
            isDarkMode={isDarkMode}
            checkLimit={checkLimit}
            incrementStats={incrementStats}
          />
        )}

        {view === "todo" && (
          <TodoView
            uid={uid}
            todos={todos}
            key={`todo-${uid || "local"}`}
            today={todayStr}
            categories={profile.todoCategories}
            isDarkMode={isDarkMode}
            checkLimit={checkLimit}
          />
        )}

        {view === "friend" && (
          <FriendView
            uid={uid}
            currentUserName={profile.name}
            isDarkMode={isDarkMode}
          />
        )}

        {view === "profile" && (
          <ProfileView
            uid={uid}
            profile={profile}
            setProfile={setProfile}
            onSave={handleSaveProfile}
            isDarkMode={isDarkMode}
          />
        )}

        {view === "bucketList" && (
          <BucketListView
            key={uid || "local"}
            uid={uid}
            isDarkMode={isDarkMode}
          />
        )}

        </div>
        <nav className="primary-nav" aria-label="Main navigation" style={{ background: isDarkMode ? "#1f2937" : "white" }}>
          {(["home", "habit", "todo", "dream", "friend"] as const).map(id => <button key={id} data-opening={`tab-${id}`} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)} style={{ color: view === id ? "#6366f1" : "inherit" }}>{id === "home" ? "Home" : tt(id)}</button>)}
        </nav>
      </div>
    </main >
  );
}


