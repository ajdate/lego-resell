import { useEffect, useState } from "react";

/** True after the component has mounted in the browser. */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
