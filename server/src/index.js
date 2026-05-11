import { connectDB } from "./config/db.js";
import { createApp } from "./config/app.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
     await connectDB();
  const app = createApp();
  const port = process.env.PORT || 8080;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

main();