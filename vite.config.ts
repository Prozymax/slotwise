import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Alias @progress/kendo-licensing to a stub so the app renders without a
// licence banner in dev/demo. Replace with a real telerik-license.txt once
// you run `npx kendo-ui-license get-key` and `npx kendo-ui-license activate`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@progress/kendo-licensing": resolve(__dirname, "src/kendo-license-stub.ts"),
    },
  },
});
