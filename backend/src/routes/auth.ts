import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { generarToken } from "../middleware/auth.js";
import { Rol } from "../types/index.js";

const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña requeridos" });
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.activo) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  const ok = await bcrypt.compare(password, usuario.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  const token = generarToken({
    userId: usuario.id,
    email: usuario.email,
    rol: usuario.rol as Rol,
    localId: usuario.localId ?? undefined,
  });

  res.json({
    token,
    user: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      localId: usuario.localId,
    },
  });
});

export default router;
