// lib/titles.ts

export type TitleCategory = "royalty" | "continuity" | "points" | "streak" | "level" | "effort" | "hidden";

export interface TitleDefinition {
    id: string;
    name: string;
    category: TitleCategory;
    conditionDescription: string;
    bonusPoints: number;
    check: (stats: any) => boolean;
}

export const TITLE_DEFINITIONS: TitleDefinition[] = [
    // 王道
    {
        id: "debut",
        name: "新人デビュー",
        category: "royalty",
        conditionDescription: "習慣を1つ以上追加する",
        bonusPoints: 10,
        check: (s) => (s.habitsCreatedCount || 0) >= 1
    },

    // 継続系（ログイン日数）
    {
        id: "login_3",
        name: "3日坊主撃破",
        category: "continuity",
        conditionDescription: "累計3日ログイン",
        bonusPoints: 30,
        check: (s) => (s.loginDays || 0) >= 3
    },
    {
        id: "login_7",
        name: "1週間の壁突破",
        category: "continuity",
        conditionDescription: "累計7日ログイン",
        bonusPoints: 70,
        check: (s) => (s.loginDays || 0) >= 7
    },
    {
        id: "login_10",
        name: "継続ビギナー",
        category: "continuity",
        conditionDescription: "累計10日ログイン",
        bonusPoints: 100,
        check: (s) => (s.loginDays || 0) >= 10
    },
    {
        id: "login_20",
        name: "継続マスター",
        category: "continuity",
        conditionDescription: "累計20日ログイン",
        bonusPoints: 200,
        check: (s) => (s.loginDays || 0) >= 20
    },
    {
        id: "login_30",
        name: "月間制覇者",
        category: "continuity",
        conditionDescription: "累計30日ログイン",
        bonusPoints: 300,
        check: (s) => (s.loginDays || 0) >= 30
    },
    {
        id: "login_100",
        name: "百日修行僧",
        category: "continuity",
        conditionDescription: "累計100日ログイン",
        bonusPoints: 1000,
        check: (s) => (s.loginDays || 0) >= 100
    },
    {
        id: "login_200",
        name: "習慣の求道者",
        category: "continuity",
        conditionDescription: "累計200日ログイン",
        bonusPoints: 2000,
        check: (s) => (s.loginDays || 0) >= 200
    },
    {
        id: "login_365",
        name: "一年の守護者",
        category: "continuity",
        conditionDescription: "累計365日ログイン",
        bonusPoints: 3650,
        check: (s) => (s.loginDays || 0) >= 365
    },
    {
        id: "login_1095",
        name: "3年ログイン継続",
        category: "continuity",
        conditionDescription: "累計1095日ログイン",
        bonusPoints: 10950,
        check: (s) => (s.loginDays || 0) >= 1095
    },
    {
        id: "login_2555",
        name: "7年ログイン継続",
        category: "continuity",
        conditionDescription: "累計2555日ログイン",
        bonusPoints: 25550,
        check: (s) => (s.loginDays || 0) >= 2555
    },
    {
        id: "login_3650",
        name: "10年ログイン継続",
        category: "continuity",
        conditionDescription: "累計3650日ログイン",
        bonusPoints: 36500,
        check: (s) => (s.loginDays || 0) >= 3650
    },

    // pt系
    {
        id: "pt_300",
        name: "猛者",
        category: "points",
        conditionDescription: "累計300pt達成",
        bonusPoints: 50,
        check: (s) => (s.totalPoints || 0) >= 300
    },
    {
        id: "pt_700",
        name: "鉄人",
        category: "points",
        conditionDescription: "累計700pt達成",
        bonusPoints: 100,
        check: (s) => (s.totalPoints || 0) >= 700
    },
    {
        id: "pt_1000",
        name: "レジェンド",
        category: "points",
        conditionDescription: "累計1000pt達成",
        bonusPoints: 200,
        check: (s) => (s.totalPoints || 0) >= 1000
    },
    {
        id: "pt_10000",
        name: "狂気",
        category: "points",
        conditionDescription: "累計10000pt達成",
        bonusPoints: 1000,
        check: (s) => (s.totalPoints || 0) >= 10000
    },
    {
        id: "pt_20000",
        name: "無限機関",
        category: "points",
        conditionDescription: "累計20000pt達成",
        bonusPoints: 2000,
        check: (s) => (s.totalPoints || 0) >= 20000
    },

    // 連続達成（ストリーク）
    {
        id: "streak_3",
        name: "連続3日ストリーカー",
        category: "streak",
        conditionDescription: "3日連続全達成",
        bonusPoints: 50,
        check: (s) => (s.maxStreak || 0) >= 3
    },
    {
        id: "streak_7",
        name: "7日コンボ",
        category: "streak",
        conditionDescription: "7日連続全達成",
        bonusPoints: 100,
        check: (s) => (s.maxStreak || 0) >= 7
    },
    {
        id: "streak_10",
        name: "10日コンボマスター",
        category: "streak",
        conditionDescription: "10日連続全達成",
        bonusPoints: 150,
        check: (s) => (s.maxStreak || 0) >= 10
    },
    {
        id: "streak_21",
        name: "連続の鬼",
        category: "streak",
        conditionDescription: "21日（3週間）連続全達成",
        bonusPoints: 300,
        check: (s) => (s.maxStreak || 0) >= 21
    },
    {
        id: "streak_30",
        name: "連続神話",
        category: "streak",
        conditionDescription: "30日連続全達成",
        bonusPoints: 500,
        check: (s) => (s.maxStreak || 0) >= 30
    },
    {
        id: "streak_90",
        name: "パーフェクト継続者",
        category: "streak",
        conditionDescription: "90日連続全達成",
        bonusPoints: 1000,
        check: (s) => (s.maxStreak || 0) >= 90
    },
    {
        id: "streak_210",
        name: "記録ホルダー",
        category: "streak",
        conditionDescription: "210日連続全達成",
        bonusPoints: 2000,
        check: (s) => (s.maxStreak || 0) >= 210
    },
    {
        id: "streak_365",
        name: "伝説のストリーク",
        category: "streak",
        conditionDescription: "365日連続全達成",
        bonusPoints: 5000,
        check: (s) => (s.maxStreak || 0) >= 365
    },

    // レベルアップ
    {
        id: "lv_3",
        name: "習慣見習い",
        category: "level",
        conditionDescription: "Lv3到達",
        bonusPoints: 30,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 3
    },
    {
        id: "lv_10",
        name: "習慣戦士",
        category: "level",
        conditionDescription: "Lv10到達",
        bonusPoints: 100,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 10
    },
    {
        id: "lv_20",
        name: "習慣騎士",
        category: "level",
        conditionDescription: "Lv20到達",
        bonusPoints: 200,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 20
    },
    {
        id: "lv_30",
        name: "習慣魔導士",
        category: "level",
        conditionDescription: "Lv30到達",
        bonusPoints: 300,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 30
    },
    {
        id: "lv_50",
        name: "習慣賢者",
        category: "level",
        conditionDescription: "Lv50到達",
        bonusPoints: 500,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 50
    },
    {
        id: "lv_60",
        name: "習慣マスター",
        category: "level",
        conditionDescription: "Lv60到達",
        bonusPoints: 600,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 60
    },
    {
        id: "lv_100",
        name: "グランドマスター",
        category: "level",
        conditionDescription: "Lv100到達",
        bonusPoints: 1000,
        check: (s) => (Math.floor((s.totalPoints || 0) / 100) + 1) >= 100
    },

    // ガチ努力系
    {
        id: "effort_goal_50",
        name: "生活設計士",
        category: "effort",
        conditionDescription: "目標を累計50個追加",
        bonusPoints: 100,
        check: (s) => (s.goalsCreatedCount || 0) >= 50
    },
    {
        id: "effort_goal_100",
        name: "人生ビルダー",
        category: "effort",
        conditionDescription: "目標を累計100個追加",
        bonusPoints: 200,
        check: (s) => (s.goalsCreatedCount || 0) >= 100
    },
    {
        id: "effort_habit_50",
        name: "習慣設計師",
        category: "effort",
        conditionDescription: "習慣を累計50個追加",
        bonusPoints: 100,
        check: (s) => (s.habitsCreatedCount || 0) >= 50
    },
    {
        id: "effort_habit_100",
        name: "自己統制者",
        category: "effort",
        conditionDescription: "習慣を累計100個追加",
        bonusPoints: 200,
        check: (s) => (s.habitsCreatedCount || 0) >= 100
    },
    {
        id: "effort_goal_achieve_10",
        name: "有言実行",
        category: "effort",
        conditionDescription: "目標を累計10個達成",
        bonusPoints: 300,
        check: (s) => (s.goalsAchievedCount || 0) >= 10
    },
    {
        id: "effort_goal_achieve_30",
        name: "夢追い人",
        category: "effort",
        conditionDescription: "目標を累計30個達成",
        bonusPoints: 500,
        check: (s) => (s.goalsAchievedCount || 0) >= 30
    },
    {
        id: "effort_goal_achieve_50",
        name: "達成マニア",
        category: "effort",
        conditionDescription: "目標を累計50個達成",
        bonusPoints: 1000,
        check: (s) => (s.goalsAchievedCount || 0) >= 50
    },
    {
        id: "effort_goal_achieve_100",
        name: "鋼の意思",
        category: "effort",
        conditionDescription: "目標を累計100個達成",
        bonusPoints: 2000,
        check: (s) => (s.goalsAchievedCount || 0) >= 100
    },

    // 隠し称号
    {
        id: "login_streak_90",
        name: "3ヶ月皆勤",
        category: "hidden",
        conditionDescription: "累計90日ログイン",
        bonusPoints: 1000,
        check: (s) => (s.loginDays || 0) >= 90
    },
    {
        id: "anniversary_1",
        name: "初ログインから365日",
        category: "hidden",
        conditionDescription: "利用開始から1年経過",
        bonusPoints: 3650,
        check: (s) => {
            if (!s.firstLoginAt) return false;
            const first = s.firstLoginAt.toDate ? s.firstLoginAt.toDate() : new Date(s.firstLoginAt);
            const diff = Date.now() - first.getTime();
            return diff >= 365 * 24 * 60 * 60 * 1000;
        }
    }
];
