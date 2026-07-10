export const clerkAuthAppearance: any = {
  elements: {
    rootBox: "w-full",
    card: "bg-[#111] border border-white/10 shadow-xl",
    headerTitle: "text-white",
    headerSubtitle: "text-white/60",
    socialButtonsBlockButton:
      "bg-white/5 border border-white/10 text-white hover:bg-white/10",
    socialButtonsBlockButtonText: "text-white font-medium",
    socialButtonsProviderIcon__apple: "invert",
    dividerLine: "bg-white/10",
    dividerText: "text-white/40",
    formFieldLabel: "text-white/70",
    formFieldInput: "bg-white/5 border border-white/10 text-white",
    footerActionLink: "text-amber-400",
    formButtonPrimary: "bg-amber-500 hover:bg-amber-400 text-black font-bold",
  },
};

export const clerkAuthOAuthProps = {
  // Redirect flow works reliably in Capacitor iOS WebView for Apple/Google SSO.
  oauthFlow: "redirect" as const,
  fallbackRedirectUrl: "/",
};

export const clerkSignUpAppearance: any = clerkAuthAppearance;
