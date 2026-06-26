"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { checkIsPro } from "@/src/lib/pro";

export function useIsPro() {
  const { user, isLoaded } = useUser();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setIsPro(false);
      setIsLoading(false);
      return;
    }

    checkIsPro(user.id).then((pro) => {
      // During beta everyone gets Pro free
      // Change this to just setIsPro(pro) when ready to charge
      void pro;
      setIsPro(true); // Beta override
      setIsLoading(false);
    });
  }, [user, isLoaded]);

  return { isPro, isLoading };
}
