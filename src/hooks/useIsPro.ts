"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function useIsPro() {
  const { user, isLoaded } = useUser();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    // Beta override — everyone gets Pro free (signed in or not)
    void user;
    setIsPro(true);
    setIsLoading(false);
  }, [user, isLoaded]);

  return { isPro, isLoading };
}
