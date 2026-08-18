import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  target: "node24",
  sourcemap: true,
  dts: false,
});
