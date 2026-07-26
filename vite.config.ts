import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import adminImportsHandler from "./api/admin/imports";
import { explainWithGemini, type ExplainRequest } from "./api/explain-question";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), localExplainApi(env.GEMINI_API_KEY), localAdminImportsApi(env)],
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

function localAdminImportsApi(env: Record<string, string>): Plugin {
  return {
    name: "civiq-local-admin-imports-api",
    configureServer(server) {
      installServerEnv(env);
      server.middlewares.use("/api/admin/imports", async (request, response) => {
        try {
          const body = request.method === "POST" ? await readJson(request) : undefined;
          let statusCode = 200;
          const vercelResponse = {
            status(code: number) {
              statusCode = code;
              return vercelResponse;
            },
            json(body: unknown) {
              sendJson(response, statusCode, body);
            },
            setHeader(name: string, value: string) {
              response.setHeader(name, value);
            }
          };

          await adminImportsHandler(
            {
              method: request.method,
              body,
              headers: request.headers
            },
            vercelResponse
          );
        } catch {
          sendJson(response, 400, { error: "Could not process the admin import request." });
        }
      });
    }
  };
}

function installServerEnv(env: Record<string, string>) {
  for (const key of [
    "ADMIN_EMAILS",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
}

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
