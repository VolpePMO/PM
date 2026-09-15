import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Configuração Vite própria do projeto, sem dependência da plataforma de
// origem. A ordem dos plugins importa: caminhos e CSS entram antes do TanStack
// Start, o Nitro empacota o servidor e o plugin do React vem por último.
//
// NITRO_PRESET escolhe o alvo do build. O padrão é "netlify"; para outro
// provedor basta rodar, por exemplo, `NITRO_PRESET=vercel npm run build`, ou
// `NITRO_PRESET=node-server` para subir em um container próprio.
const preset = process.env["NITRO_PRESET"] ?? "netlify";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redireciona o entry de servidor do TanStack Start para src/server.ts,
      // que embrulha erros de SSR em uma página legível.
      server: { entry: "server" },
    }),
    // O Nitro só entra no build: em `vite dev` o servidor do próprio Vite já
    // faz o SSR, e carregar o Nitro aqui quebra o dev server.
    command === "build" ? nitro({ preset }) : null,
    viteReact(),
  ],
  resolve: {
    // Os caminhos com "@/..." vêm do tsconfig; o alias explícito abaixo cobre
    // o SSR do Nitro, que não lê o tsconfig.
    tsconfigPaths: true,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Uma cópia só de cada uma destas bibliotecas: duas cópias de React ou do
    // Router quebram os hooks em tempo de execução.
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-router",
      "@tanstack/react-start",
      "@tanstack/react-query",
    ],
  },
}));
