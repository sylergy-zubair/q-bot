import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { healthHandler } from "./routes/health.js";
import { schemaHandler } from "./routes/schema.js";
import { nlQueryHandler } from "./routes/nlQuery.js";
import { insightsHandler } from "./routes/insights.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*"
  })
);
app.use(express.json());

app.get("/health", healthHandler);
app.get("/schema", schemaHandler);
app.post("/nl-query", nlQueryHandler);
app.get("/insights", insightsHandler);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

