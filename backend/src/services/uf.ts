interface MindicadorRespuesta {
  serie: { fecha: string; valor: number }[];
}

export async function obtenerUfHoy(): Promise<{ valor: number; fecha: string }> {
  const res = await fetch("https://mindicador.cl/api/uf");
  if (!res.ok) throw new Error(`mindicador.cl respondió con estado ${res.status}`);

  const data = await res.json() as MindicadorRespuesta;
  const ultimo = data.serie?.[0];
  if (!ultimo?.valor) throw new Error("Respuesta inesperada de mindicador.cl");

  return {
    valor: ultimo.valor,
    fecha: ultimo.fecha.slice(0, 10),
  };
}
