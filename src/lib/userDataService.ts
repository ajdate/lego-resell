import { supabaseClient } from "./supabase-client";

const PORTFOLIO_KEY = "lego-portfolio";
const WATCHLIST_KEY = "lego-watchlist";
const TARGETS_KEY = "lego-price-targets";
const PREFERENCES_KEY = "lego-preferences";
const DISMISSED_ALERTS_KEY = "lego-dismissed-alerts";
const READ_ALERTS_KEY = "lego-read-alerts";
const JSON_PREFIX = "__bv1:";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function encodeJson(value: unknown): string {
  return `${JSON_PREFIX}${JSON.stringify(value)}`;
}

function decodeJson<T>(value: string | null | undefined): T | null {
  if (!value?.startsWith(JSON_PREFIX)) return null;
  try {
    return JSON.parse(value.slice(JSON_PREFIX.length)) as T;
  } catch {
    return null;
  }
}

// PORTFOLIO
export async function getPortfolio(userId: string | null) {
  if (!userId) {
    return readLocal<unknown[]>(PORTFOLIO_KEY, []);
  }

  const { data, error } = await supabaseClient
    .from("portfolio")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Portfolio load error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const parsed = decodeJson<Record<string, unknown>>(row.notes);
    if (parsed) return parsed;
    return {
      setNumber: row.set_number,
      name: row.set_name ?? "",
      theme: "",
      condition: row.condition ?? "sealed",
      purchasePrice: Number(row.purchase_price ?? 0),
      estimatedValue: Number(row.purchase_price ?? 0),
      suggestedListPrice: Number(row.purchase_price ?? 0),
      recommendation: "HOLD",
      quantity: 1,
      totalPaid: Number(row.purchase_price ?? 0),
      totalEstimatedValue: Number(row.purchase_price ?? 0),
      copies: [
        {
          id: row.id,
          condition: row.condition ?? "sealed",
          purchasePrice: Number(row.purchase_price ?? 0),
          intent: row.intent ?? "undecided",
          intentTag: row.intent ?? "undecided",
          notes: typeof row.notes === "string" ? row.notes : "",
          dateAdded: row.created_at ?? new Date().toISOString(),
        },
      ],
    };
  });
}

export async function savePortfolioItems(
  userId: string | null,
  items: Record<string, unknown>[],
) {
  if (!userId) {
    writeLocal(PORTFOLIO_KEY, items);
    return items;
  }

  const { error: deleteError } = await supabaseClient
    .from("portfolio")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Portfolio clear error:", deleteError);
    return items;
  }

  if (items.length === 0) return items;

  const rows = items.map((item) => {
    const setNumber = String(item.setNumber ?? "");
    const copies = Array.isArray(item.copies) ? item.copies : [];
    const firstCopy = copies[0] as Record<string, unknown> | undefined;
    return {
      user_id: userId,
      set_number: setNumber,
      set_name: String(item.name ?? ""),
      purchase_price: Number(item.purchasePrice ?? firstCopy?.purchasePrice ?? 0),
      condition: String(item.condition ?? firstCopy?.condition ?? "sealed"),
      intent: String(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (firstCopy as any)?.intentTag ?? (firstCopy as any)?.intent ?? "undecided",
      ),
      notes: encodeJson(item),
    };
  });

  const { error } = await supabaseClient.from("portfolio").insert(rows);
  if (error) console.error("Portfolio save error:", error);
  return items;
}

export async function addPortfolioItem(userId: string | null, item: Record<string, unknown>) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(PORTFOLIO_KEY, []);
    const updated = [...existing, { ...item, id: Date.now().toString() }];
    writeLocal(PORTFOLIO_KEY, updated);
    return updated;
  }

  const copies = Array.isArray(item.copies) ? item.copies : [];
  const firstCopy = copies[0] as Record<string, unknown> | undefined;

  const { data, error } = await supabaseClient
    .from("portfolio")
    .insert({
      user_id: userId,
      set_number: String(item.setNumber ?? ""),
      set_name: String(item.name ?? ""),
      purchase_price: Number(item.purchasePrice ?? 0),
      condition: String(item.condition ?? "sealed"),
      intent: String(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (firstCopy as any)?.intentTag ?? (firstCopy as any)?.intent ?? "undecided",
      ),
      notes: encodeJson(item),
    })
    .select();

  if (error) console.error("Portfolio insert error:", error);
  return data;
}

export async function updatePortfolioItem(
  userId: string | null,
  id: string,
  updates: Record<string, unknown>,
) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(PORTFOLIO_KEY, []);
    const updated = existing.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );
    writeLocal(PORTFOLIO_KEY, updated);
    return updated;
  }

  const { data, error } = await supabaseClient
    .from("portfolio")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select();

  if (error) console.error("Portfolio update error:", error);
  return data;
}

export async function removePortfolioItem(userId: string | null, id: string) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(PORTFOLIO_KEY, []);
    const updated = existing.filter((item) => item.id !== id);
    writeLocal(PORTFOLIO_KEY, updated);
    return updated;
  }

  const { error } = await supabaseClient
    .from("portfolio")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Portfolio delete error:", error);
}

// WATCHLIST
export async function getWatchlist(userId: string | null) {
  if (!userId) {
    return readLocal<unknown[]>(WATCHLIST_KEY, []);
  }

  const { data, error } = await supabaseClient
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Watchlist load error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const parsed = decodeJson<Record<string, unknown>>(row.set_name);
    if (parsed) return parsed;
    return {
      setNumber: row.set_number,
      name: row.set_name ?? "",
      theme: "",
      recommendation: "HOLD",
      recommendationAtAdd: "HOLD",
      estimatedValue: Number(row.target_price ?? 0),
      dateAdded: row.created_at ?? new Date().toISOString(),
    };
  });
}

export async function saveWatchlistItems(
  userId: string | null,
  items: Record<string, unknown>[],
) {
  if (!userId) {
    writeLocal(WATCHLIST_KEY, items);
    return items;
  }

  const { error: deleteError } = await supabaseClient
    .from("watchlist")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Watchlist clear error:", deleteError);
    return items;
  }

  if (items.length === 0) return items;

  const rows = items.map((item) => ({
    user_id: userId,
    set_number: String(item.setNumber ?? ""),
    set_name: encodeJson(item),
    target_price: Number(item.estimatedValue ?? 0),
  }));

  const { error } = await supabaseClient.from("watchlist").insert(rows);
  if (error) console.error("Watchlist save error:", error);
  return items;
}

export async function addWatchlistItem(userId: string | null, item: Record<string, unknown>) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(WATCHLIST_KEY, []);
    const updated = [...existing, { ...item, id: Date.now().toString() }];
    writeLocal(WATCHLIST_KEY, updated);
    return updated;
  }

  const { data, error } = await supabaseClient
    .from("watchlist")
    .insert({
      user_id: userId,
      set_number: String(item.setNumber ?? ""),
      set_name: encodeJson(item),
      target_price: Number(item.estimatedValue ?? 0),
    })
    .select();

  if (error) console.error("Watchlist insert error:", error);
  return data;
}

export async function removeWatchlistItem(userId: string | null, id: string) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(WATCHLIST_KEY, []);
    const updated = existing.filter(
      (item) => item.id !== id && item.setNumber !== id,
    );
    writeLocal(WATCHLIST_KEY, updated);
    return updated;
  }

  const { error } = await supabaseClient
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .or(`id.eq.${id},set_number.eq.${id}`);

  if (error) console.error("Watchlist delete error:", error);
}

// ALERTS (dismissed / read state)
export async function getDismissedAlertIds(userId: string | null): Promise<string[]> {
  if (!userId) {
    return readLocal<string[]>(DISMISSED_ALERTS_KEY, []);
  }

  const { data, error } = await supabaseClient
    .from("alerts")
    .select("message")
    .eq("user_id", userId)
    .eq("dismissed", true)
    .eq("type", "dismissed");

  if (error) {
    console.error("Alerts load error:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.message)
    .filter((id): id is string => typeof id === "string");
}

export async function getReadAlertIds(userId: string | null): Promise<string[]> {
  if (!userId) {
    return readLocal<string[]>(READ_ALERTS_KEY, []);
  }

  const { data, error } = await supabaseClient
    .from("alerts")
    .select("message")
    .eq("user_id", userId)
    .eq("type", "read");

  if (error) {
    console.error("Read alerts load error:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => row.message)
    .filter((id): id is string => typeof id === "string");
}

export async function dismissAlert(userId: string | null, id: string) {
  if (!userId) {
    const existing = new Set(readLocal<string[]>(DISMISSED_ALERTS_KEY, []));
    existing.add(id);
    writeLocal(DISMISSED_ALERTS_KEY, [...existing]);
    return;
  }

  const { error } = await supabaseClient.from("alerts").upsert(
    {
      user_id: userId,
      set_number: "",
      set_name: "Alert",
      type: "dismissed",
      message: id,
      dismissed: true,
    },
    { onConflict: "user_id,message" },
  );

  if (error) {
    const { error: insertError } = await supabaseClient.from("alerts").insert({
      user_id: userId,
      set_number: "",
      set_name: "Alert",
      type: "dismissed",
      message: id,
      dismissed: true,
    });
    if (insertError) console.error("Alert dismiss error:", insertError);
  }
}

export async function markAlertRead(userId: string | null, id: string) {
  if (!userId) {
    const existing = new Set(readLocal<string[]>(READ_ALERTS_KEY, []));
    existing.add(id);
    writeLocal(READ_ALERTS_KEY, [...existing]);
    return;
  }

  const { error } = await supabaseClient.from("alerts").insert({
    user_id: userId,
    set_number: "",
    set_name: "Alert",
    type: "read",
    message: id,
    dismissed: false,
  });

  if (error) console.error("Alert read error:", error);
}

export async function getAlerts(userId: string | null) {
  if (!userId) {
    return readLocal<unknown[]>("lego-alerts", []);
  }

  const { data } = await supabaseClient
    .from("alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false });

  return data || [];
}

// PRICE TARGETS
export async function getPriceTargets(userId: string | null) {
  if (!userId) {
    return readLocal<unknown[]>(TARGETS_KEY, []);
  }

  const { data, error } = await supabaseClient
    .from("price_targets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Targets load error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const parsed = decodeJson<Record<string, unknown>>(row.set_name);
    if (parsed) return parsed;
    return {
      id: row.id,
      setNumber: row.set_number,
      setName: row.set_name,
      targetType: row.target_type ?? "sell",
      targetPrice: Number(row.target_price ?? 0),
      status: row.achieved ? "achieved" : "active",
      dateCreated: row.created_at,
    };
  });
}

export async function savePriceTargets(
  userId: string | null,
  items: Record<string, unknown>[],
) {
  if (!userId) {
    writeLocal(TARGETS_KEY, items);
    return items;
  }

  const { error: deleteError } = await supabaseClient
    .from("price_targets")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Targets clear error:", deleteError);
    return items;
  }

  if (items.length === 0) return items;

  const rows = items.map((item) => ({
    user_id: userId,
    set_number: String(item.setNumber ?? ""),
    set_name: encodeJson(item),
    target_price: Number(item.targetPrice ?? 0),
    target_type: String(item.targetType ?? "sell"),
    achieved: item.status === "achieved",
  }));

  const { error } = await supabaseClient.from("price_targets").insert(rows);
  if (error) console.error("Targets save error:", error);
  return items;
}

export async function addPriceTarget(userId: string | null, item: Record<string, unknown>) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(TARGETS_KEY, []);
    const updated = [...existing, { ...item, id: Date.now().toString() }];
    writeLocal(TARGETS_KEY, updated);
    return updated;
  }

  const { data, error } = await supabaseClient
    .from("price_targets")
    .insert({
      user_id: userId,
      set_number: String(item.setNumber ?? ""),
      set_name: encodeJson(item),
      target_price: Number(item.targetPrice ?? 0),
      target_type: String(item.targetType ?? "sell"),
      achieved: item.status === "achieved",
    })
    .select();

  if (error) console.error("Target insert error:", error);
  return data;
}

export async function removePriceTarget(userId: string | null, id: string) {
  if (!userId) {
    const existing = readLocal<Record<string, unknown>[]>(TARGETS_KEY, []);
    const updated = existing.filter((t) => t.id !== id);
    writeLocal(TARGETS_KEY, updated);
    return updated;
  }

  const { error } = await supabaseClient
    .from("price_targets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) console.error("Target delete error:", error);
}

// USER PREFERENCES
export async function getUserPreferences(userId: string | null) {
  if (!userId) {
    return readLocal(PREFERENCES_KEY, { goal: "investor", currency: "AUD" });
  }

  const { data, error } = await supabaseClient
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) console.error("Preferences load error:", error);
  return data || { goal: "investor", currency: "AUD" };
}

export async function saveUserPreferences(
  userId: string | null,
  prefs: Record<string, unknown>,
) {
  if (!userId) {
    writeLocal(PREFERENCES_KEY, prefs);
    return prefs;
  }

  const { data, error } = await supabaseClient
    .from("user_preferences")
    .upsert({ ...prefs, user_id: userId })
    .select();

  if (error) console.error("Preferences save error:", error);
  return data;
}

export async function migrateLocalStorageToSupabase(userId: string) {
  const migrationKey = `migration-done-${userId}`;
  if (localStorage.getItem(migrationKey)) return;

  const portfolio = readLocal<Record<string, unknown>[]>(PORTFOLIO_KEY, []);
  if (portfolio.length > 0) {
    await savePortfolioItems(userId, portfolio);
  }

  const watchlist = readLocal<Record<string, unknown>[]>(WATCHLIST_KEY, []);
  if (watchlist.length > 0) {
    await saveWatchlistItems(userId, watchlist);
  }

  const targets = readLocal<Record<string, unknown>[]>(TARGETS_KEY, []);
  if (targets.length > 0) {
    await savePriceTargets(userId, targets);
  }

  const dismissed = readLocal<string[]>(DISMISSED_ALERTS_KEY, []);
  for (const id of dismissed) {
    await dismissAlert(userId, id);
  }

  const read = readLocal<string[]>(READ_ALERTS_KEY, []);
  for (const id of read) {
    await markAlertRead(userId, id);
  }

  const prefs = readLocal<Record<string, unknown>>(PREFERENCES_KEY, {});
  if (Object.keys(prefs).length > 0) {
    await saveUserPreferences(userId, prefs);
  }

  localStorage.setItem(migrationKey, "true");
  console.log("Migration complete:", {
    portfolio: portfolio.length,
    watchlist: watchlist.length,
    targets: targets.length,
  });
}
