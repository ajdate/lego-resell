import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.brickvalue.www",
  appName: "BrickValue",
  webDir: "out",
  server: {
    url: "https://brickvalue.app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "brickvalue.app",
      "*.brickvalue.app",
      "clerk.brickvalue.app",
      "accounts.brickvalue.app",
      "*.clerk.accounts.dev",
      "appleid.apple.com",
      "*.apple.com",
      "*.googleapis.com",
      "accounts.google.com",
    ],
  },
  ios: {
    backgroundColor: "#0a0a0a",
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: "mobile",
  },
};

export default config;
