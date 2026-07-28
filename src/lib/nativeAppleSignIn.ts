import { isNativeApp } from "@/lib/isNative";

export async function nativeAppleSignIn() {
  if (!isNativeApp()) return null;

  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");

    const result = await SignInWithApple.authorize({
      clientId: "app.brickvalue.signin",
      redirectURI: "https://clerk.brickvalue.app/v1/oauth_callback",
      scopes: "email name",
      state: Math.random().toString(36).substring(7),
      nonce: Math.random().toString(36).substring(7),
    });

    return result.response;
  } catch (err) {
    console.error("Native Apple Sign In error:", err);
    return null;
  }
}
