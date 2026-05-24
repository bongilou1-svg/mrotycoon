// vite.config.ts
import { defineConfig } from "file:///sessions/modest-laughing-franklin/mnt/mrotycoon/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///sessions/modest-laughing-franklin/mnt/mrotycoon/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { viteSingleFile } from "file:///sessions/modest-laughing-franklin/mnt/mrotycoon/node_modules/vite-plugin-singlefile/dist/esm/index.js";
import { resolve } from "path";
var host = process.env.TAURI_DEV_HOST;
var vite_config_default = defineConfig(async () => ({
  plugins: [svelte(), viteSingleFile()],
  base: "./",
  resolve: {
    alias: {
      $lib: resolve("./src/lib")
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : void 0,
    watch: { ignored: ["**/src-tauri/**"] }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvbW9kZXN0LWxhdWdoaW5nLWZyYW5rbGluL21udC9tcm90eWNvb25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9tb2Rlc3QtbGF1Z2hpbmctZnJhbmtsaW4vbW50L21yb3R5Y29vbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvbW9kZXN0LWxhdWdoaW5nLWZyYW5rbGluL21udC9tcm90eWNvb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcbmltcG9ydCB7IHZpdGVTaW5nbGVGaWxlIH0gZnJvbSBcInZpdGUtcGx1Z2luLXNpbmdsZWZpbGVcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuXG4vLyBAdHMtZXhwZWN0LWVycm9yIHByb2Nlc3MgaXMgYSBub2RlanMgZ2xvYmFsXG5jb25zdCBob3N0ID0gcHJvY2Vzcy5lbnYuVEFVUklfREVWX0hPU1Q7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhhc3luYyAoKSA9PiAoe1xuICBwbHVnaW5zOiBbc3ZlbHRlKCksIHZpdGVTaW5nbGVGaWxlKCldLFxuICBiYXNlOiBcIi4vXCIsXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJGxpYjogcmVzb2x2ZShcIi4vc3JjL2xpYlwiKSxcbiAgICB9LFxuICB9LFxuICBjbGVhclNjcmVlbjogZmFsc2UsXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDE0MjAsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBob3N0OiBob3N0IHx8IGZhbHNlLFxuICAgIGhtcjogaG9zdCA/IHsgcHJvdG9jb2w6IFwid3NcIiwgaG9zdCwgcG9ydDogMTQyMSB9IDogdW5kZWZpbmVkLFxuICAgIHdhdGNoOiB7IGlnbm9yZWQ6IFtcIioqL3NyYy10YXVyaS8qKlwiXSB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrVSxTQUFTLG9CQUFvQjtBQUMvVixTQUFTLGNBQWM7QUFDdkIsU0FBUyxzQkFBc0I7QUFDL0IsU0FBUyxlQUFlO0FBR3hCLElBQU0sT0FBTyxRQUFRLElBQUk7QUFFekIsSUFBTyxzQkFBUSxhQUFhLGFBQWE7QUFBQSxFQUN2QyxTQUFTLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQztBQUFBLEVBQ3BDLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLE1BQU0sUUFBUSxXQUFXO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQUEsRUFDQSxhQUFhO0FBQUEsRUFDYixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNLFFBQVE7QUFBQSxJQUNkLEtBQUssT0FBTyxFQUFFLFVBQVUsTUFBTSxNQUFNLE1BQU0sS0FBSyxJQUFJO0FBQUEsSUFDbkQsT0FBTyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRTtBQUFBLEVBQ3hDO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
