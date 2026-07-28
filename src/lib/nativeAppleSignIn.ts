import { isNativeApp } from "@/lib/isNative";

export async function nativeAppleSignIn(): Promise<boolean> {
  if (!isNativeApp()) return false;

  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");

    const nonce = Math.random().toString(36).substring(2, 15);

    const result = await SignInWithApple.authorize({
      clientId: "app.brickvalue.www",
      redirectURI: "https://brickvalue.app",
      scopes: "email name",
      state: Math.random().toString(36).substring(2, 15),
      nonce,
    });

    const idToken = result.response.identityToken;

    if (!idToken) return false;

    const response = await fetch("/api/auth/apple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, nonce }),
    });

    const data = (await response.json()) as { success?: boolean };

    if (data.success) {
      window.location.href = "/";
      return true;
    }

    return false;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? "");
    if (message.includes("cancel") || message.includes("Cancel")) {
      return false;
    }
    console.error("Native Apple Sign In error:", err);
    return false;
  }
}
