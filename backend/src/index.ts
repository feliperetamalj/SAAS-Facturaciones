import "dotenv/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3001);

const app = createApp();
app.listen(PORT, () => {
  console.log(`🚀 ALR Backend corriendo en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
