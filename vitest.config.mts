import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// I test girano fuori da Next, che normalmente risolve l'alias "@/..." definito in
// tsconfig: qui glielo ripetiamo, così un test può importare qualsiasi modulo del sito.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
