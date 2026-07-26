import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { explainWithGemini, type ExplainRequest } from "./api/explain-question";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), localExplainApi(env.GEMINI_API_KEY)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/src/data/professional/")) return "question-bank";
            if (id.includes("/node_modules/")) return "vendor";
          }
        }
      }
    }
  };
});

function localExplainApi(apiKey?: string): Plugin {
  return {
    name: "civiq-local-explain-api",
    configureServer(server) {
      server.middlewares.use("/api/explain-question", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const body = (await readJson(request)) as ExplainRequest;

          if (!apiKey) {
            sendJson(response, 200, {
              explanation: body.builtInExplanation,
              source: "fallback",
              remainingToday: 0
            });
            return;
          }

          const explanation = await explainWithGemini(apiKey, body);
          sendJson(response, 200, {
            explanation: explanation || body.builtInExplanation,
            source: explanation ? "provider" : "fallback"
          });
        } catch {
          sendJson(response, 400, { error: "Could not explain this question" });
        }
      });
    }
  };
}

function readJson(request: import("node:http").IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}
