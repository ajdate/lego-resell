"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePortfolio() {
  const { user } = useUser();
  const [portfolio, setPortfolio] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("lego-portfolio");
      setPortfolio(saved ? JSON.parse(saved) : []);
      setLoading(false);
      return;
    }

    supabase
      .from("portfolio")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setPortfolio(data || []);
        setLoading(false);
      });
  }, [user]);

  const addToPortfolio = async (item: Record<string, unknown>) => {
    if (!user) {
      const updated = [...portfolio, { ...item, id: Date.now().toString() }];
      setPortfolio(updated);
      localStorage.setItem("lego-portfolio", JSON.stringify(updated));
      return;
    }

    const { data } = await supabase
      .from("portfolio")
      .insert({ ...item, user_id: user.id })
      .select()
      .single();

    if (data) setPortfolio((prev) => [...prev, data]);
  };

  const removeFromPortfolio = async (id: string) => {
    if (!user) {
      const updated = portfolio.filter((p) => p.id !== id);
      setPortfolio(updated);
      localStorage.setItem("lego-portfolio", JSON.stringify(updated));
      return;
    }

    await supabase.from("portfolio").delete().eq("id", id).eq("user_id", user.id);
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
  };

  return { portfolio, loading, addToPortfolio, removeFromPortfolio };
}

export function useWatchlist() {
  const { user } = useUser();
  const [watchlist, setWatchlist] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("lego-watchlist");
      setWatchlist(saved ? JSON.parse(saved) : []);
      return;
    }

    supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setWatchlist(data || []));
  }, [user]);

  const addToWatchlist = async (item: Record<string, unknown>) => {
    if (!user) {
      const updated = [...watchlist, { ...item, id: Date.now().toString() }];
      setWatchlist(updated);
      localStorage.setItem("lego-watchlist", JSON.stringify(updated));
      return;
    }

    const { data } = await supabase
      .from("watchlist")
      .insert({ ...item, user_id: user.id })
      .select()
      .single();

    if (data) setWatchlist((prev) => [...prev, data]);
  };

  const removeFromWatchlist = async (id: string) => {
    if (!user) {
      const updated = watchlist.filter((w) => w.id !== id);
      setWatchlist(updated);
      localStorage.setItem("lego-watchlist", JSON.stringify(updated));
      return;
    }

    await supabase.from("watchlist").delete().eq("id", id).eq("user_id", user.id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  return { watchlist, addToWatchlist, removeFromWatchlist };
}
