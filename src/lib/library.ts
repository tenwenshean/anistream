// A viewer's anime list: watchlist, favorites and where they stopped watching.
//
// Progress is written to this browser first (instant, works signed out) and,
// for signed-in viewers, copied to Supabase in the background so it follows
// them to other devices. Nothing here is ever awaited before a video loads.
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AnimeMeta {
  malId: number;
  title: string;
  imageUrl: string | null;
}

export interface Progress extends AnimeMeta {
  episode: number;
  position: number; // seconds
  duration: number | null;
  updatedAt: number; // ms since epoch
}

export interface LibraryRow {
  mal_id: number;
  title: string;
  image_url: string | null;
  in_watchlist: boolean;
  favorite: boolean;
  last_episode: number | null;
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
}

const PROGRESS_KEY = "anistream-progress";
const MAX_LOCAL_ENTRIES = 60;

function readLocal(): Record<string, Progress> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getLocalProgress(malId: number): Progress | null {
  return readLocal()[malId] ?? null;
}

export function listLocalProgress(): Progress[] {
  return Object.values(readLocal()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveLocalProgress(progress: Progress) {
  try {
    const all = readLocal();
    all[progress.malId] = progress;
    // keep only the most recent shows so storage stays small
    const kept = Object.values(all)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_LOCAL_ENTRIES);
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify(Object.fromEntries(kept.map((p) => [p.malId, p])))
    );
  } catch {
    // storage blocked or full: progress just isn't remembered on this device
  }
}

export function removeLocalProgress(malId: number) {
  try {
    const all = readLocal();
    delete all[malId];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {}
}

// reads the signed-in user from the cookie without a network request
export async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function saveRemoteProgress(progress: Progress) {
  const userId = await currentUserId();
  if (!userId) return;
  await createClient()
    .from("library")
    .upsert(
      {
        user_id: userId,
        mal_id: progress.malId,
        title: progress.title,
        image_url: progress.imageUrl,
        last_episode: progress.episode,
        position_seconds: Math.floor(progress.position),
        duration_seconds: progress.duration ? Math.floor(progress.duration) : null,
        updated_at: new Date(progress.updatedAt).toISOString(),
      },
      { onConflict: "user_id,mal_id" }
    )
    .then(({ error }) => {
      if (error) console.warn("Couldn't save progress:", error.message);
    });
}

export async function getLibraryEntry(malId: number): Promise<LibraryRow | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await createClient()
    .from("library")
    .select("*")
    .eq("user_id", userId)
    .eq("mal_id", malId)
    .maybeSingle();
  return (data as LibraryRow | null) ?? null;
}

// the newer of this device's and the account's progress for a show
export async function getBestProgress(meta: AnimeMeta): Promise<Progress | null> {
  const local = getLocalProgress(meta.malId);
  const row = await getLibraryEntry(meta.malId).catch(() => null);
  if (!row?.last_episode) return local;
  const remote: Progress = {
    ...meta,
    episode: row.last_episode,
    position: row.position_seconds,
    duration: row.duration_seconds,
    updatedAt: Date.parse(row.updated_at),
  };
  return !local || remote.updatedAt > local.updatedAt ? remote : local;
}

export async function setLibraryFlag(
  meta: AnimeMeta,
  flag: "in_watchlist" | "favorite",
  value: boolean
): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const { error } = await createClient()
    .from("library")
    .upsert(
      {
        user_id: userId,
        mal_id: meta.malId,
        title: meta.title,
        image_url: meta.imageUrl,
        [flag]: value,
      },
      { onConflict: "user_id,mal_id" }
    );
  if (error) console.warn("Couldn't update your list:", error.message);
  return !error;
}
