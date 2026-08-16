import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Global error handler: never drop the connection. Any rejected route handler
// (e.g. a DB/connection error on Vercel) becomes a structured JSON 500 so the
// frontend shows an actionable error + retry instead of a hung/broken request.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ): void => {
    const message = err instanceof Error ? err.message : "Unknown server error";
    console.error("[api] unhandled error:", message);
    res.status(500).json({ error: "Internal server error", detail: message });
  },
);

export default app;
