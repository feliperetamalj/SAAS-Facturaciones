import "dotenv/config";
import { createApp } from "./app.js";

const app = createApp();

// En Vercel el servidor lo gestiona la plataforma; listen() solo corre en local
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT ?? 3001);
  app.listen(PORT, () => {
    console.log(`🚀 ALR Backend corriendo en http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

export default app;
