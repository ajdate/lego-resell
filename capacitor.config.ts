import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.brickvalue.www",
  appName: "BrickValue",
  webDir: "out",
  server: {
    url: "https://brickvalue.app",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "brickvalue.app",
      "*.brickvalue.app",
      "clerk.accounts.dev",
      "*.clerk.accounts.dev",
      "accounts.clerk.com",
      "clerk.com",
      "*.clerk.com",
      "appleid.apple.com",
    ],
  },
  ios: {
    backgroundColor: "#0a0a0a",
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: "mobile",
  },
};

export default config;
