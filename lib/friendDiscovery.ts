import type { UserProfile } from "@/types/appTypes";

export const normalizeSearchText = (value: string): string => value.normalize("NFKC")
    .toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .trim().replace(/\s+/g, " ");

// An explicit current setting takes precedence over a legacy setting.
export const publicFlag = (current: unknown, legacy?: unknown): boolean =>
    typeof current === "boolean" ? current : legacy === true;

export function discoveryProfile(uid: string, data: Record<string, unknown>): UserProfile {
    const showDream = publicFlag(data.showDream, data.showDreams);
    return {
        uid, name: typeof data.name === "string" ? data.name : "",
        gender: typeof data.gender === "string" ? data.gender : "",
        isPublic: data.isPublic === true, showDream,
        dream: showDream ? (typeof data.dream === "string" ? data.dream : typeof data.dreams === "string" ? data.dreams : "") : "",
        showGoal: publicFlag(data.showGoal, data.showGoals),
        publicGoals: data.isPublic === true && publicFlag(data.showGoal, data.showGoals) && Array.isArray(data.publicGoals)
            ? data.publicGoals.filter((g): g is { id: string; title: string; deadline: string | null } => !!g && typeof g.id === "string" && typeof g.title === "string").slice(0, 3).map(g => ({ id: g.id, title: g.title, deadline: typeof g.deadline === "string" ? g.deadline : null })) : [],
        showLastLogin: data.showLastLogin === true,
        lastLoginAt: data.showLastLogin === true ? data.lastLoginAt : null,
        earnedTitles: Array.isArray(data.earnedTitles) ? data.earnedTitles.filter((v): v is string => typeof v === "string") : [],
        following: Array.isArray(data.following) ? data.following.filter((v): v is string => typeof v === "string") : [],
    };
}

function distance(a: string, b: string): number {
    const x = Array.from(a), y = Array.from(b);
    let previous = y.map((_, i) => i + 1);
    previous.unshift(0);
    for (let i = 0; i < x.length; i++) {
        const row = [i + 1];
        for (let j = 0; j < y.length; j++) {
            row.push(Math.min(row[j] + 1, previous[j + 1] + 1, previous[j] + (x[i] === y[j] ? 0 : 1)));
        }
        previous = row;
    }
    return previous[y.length];
}

function matchScore(text: string, term: string): number {
    if (!text) return 0;
    if (text === term) return 400;
    if (text.startsWith(term)) return 300;
    if (text.includes(term)) return 200;
    const length = Array.from(term).length;
    if (length < 3) return 0;
    const tolerance = length >= 6 ? 2 : 1;
    // Compare similarly sized substrings so a typo can also match within a sentence.
    const chars = Array.from(text);
    for (let start = 0; start < chars.length; start++) {
        for (let size = Math.max(1, length - tolerance); size <= length + tolerance && start + size <= chars.length; size++) {
            if (distance(term, chars.slice(start, start + size).join("")) <= tolerance) return 100;
        }
    }
    return 0;
}

export function rankSearchUsers(users: UserProfile[], term: string, currentUid: string): UserProfile[] {
    const normalized = normalizeSearchText(term);
    if (!normalized) return [];
    return users.filter(u => u.isPublic && u.uid !== currentUid).map(user => {
        const name = matchScore(normalizeSearchText(user.name), normalized);
        const dream = user.showDream ? matchScore(normalizeSearchText(user.dream), normalized) : 0;
        return { user, score: Math.max(name ? name + 10 : 0, dream) };
    }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.user.uid.localeCompare(b.user.uid)).map(item => item.user);
}

function similarDream(a: string, b: string): boolean {
    const grams = (text: string) => {
        const chars = Array.from(normalizeSearchText(text).replace(/\s/g, ""));
        return new Set(chars.slice(1).map((c, i) => chars[i] + c));
    };
    const x = grams(a), y = grams(b);
    if (!x.size || !y.size) return false;
    const common = [...x].filter(g => y.has(g)).length;
    return common >= 2 && (2 * common) / (x.size + y.size) >= 0.35;
}

export type Recommendation = { user: UserProfile; reasons: ("similarDream" | "sharedTitles")[] };

export function recommendUsers(users: UserProfile[], me: UserProfile | null, currentUid: string, following: string[]): Recommendation[] {
    const excluded = new Set([currentUid, ...following]);
    return users.filter(user => user.isPublic && !excluded.has(user.uid)).map(user => {
        const reasons: Recommendation["reasons"] = [];
        if (me?.isPublic && me.showDream && user.showDream && similarDream(me.dream, user.dream)) reasons.push("similarDream");
        if (me?.isPublic && user.earnedTitles.some(title => me.earnedTitles.includes(title))) reasons.push("sharedTitles");
        return { user, reasons };
    }).sort((a, b) => b.reasons.length - a.reasons.length || a.user.uid.localeCompare(b.user.uid)).slice(0, 20);
}
