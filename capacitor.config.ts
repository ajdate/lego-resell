import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.brickvalue.www",
  appName: "BrickValue",
  webDir: "out",
  server: {
    url: "https://brickvalue.app",
    cleartext: true,
  },
};

export default config;
