import axios from "axios";
import "dotenv/config";

const API_BASE_URL = process.env.DEMO_API_BASE_URL ?? "http://localhost:4000";

async function run(): Promise<void> {
  console.log("🚀 Starting Text2SQL PoC demo");
  console.log(`Using backend: ${API_BASE_URL}`);

  try {
    await waitForHealth();
    const schema = await axios.get(`${API_BASE_URL}/schema`);
    console.log(`✅ Schema fetched: ${schema.data.columns.length} columns discovered.`);

    const question = "Show the total order amount per customer ordered by value desc, top 5.";
    console.log(`\n💬 Question: ${question}`);

    const response = await axios.post(`${API_BASE_URL}/nl-query`, { question });

    console.log("\n📄 Generated SQL:");
    console.log(response.data.sql);

    if (response.data.warnings?.length) {
      console.log("\n⚠️ Warnings:");
      for (const warning of response.data.warnings) {
        console.log(`- ${warning}`);
      }
    }

    console.log("\n📊 Result rows:");
    console.table(response.data.result.rows);
  } catch (error) {
    console.error("Demo failed:", error);
    process.exit(1);
  }
}

async function waitForHealth(): Promise<void> {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 1000 });
      if (response.status === 200) {
        console.log("✅ Backend health check passed.");
        return;
      }
    } catch {
      console.log(`Waiting for backend (attempt ${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error("Backend did not become healthy in time.");
}

void run();

