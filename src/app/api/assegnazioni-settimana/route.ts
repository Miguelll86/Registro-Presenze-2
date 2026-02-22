import { NextResponse } from "next/server";
import { getCurrentDipendente } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getSettimana(data: Date): { dataInizio: Date; dataFine: Date } {
  const d = new Date(data);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const lunedi = new Date(d);
  lunedi.setDate(d.getDate() + diff);
  lunedi.setHours(0, 0, 0, 0);
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);
  domenica.setHours(23, 59, 59, 999);
  return { dataInizio: lunedi, dataFine: domenica };
}

/** Restituisce le assegnazioni cantiere del dipendente loggato per la settimana che contiene la data. */
export async function GET(request: Request) {
  const dipendente = await getCurrentDipendente();
  if (!dipendente) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const dataParam = searchParams.get("data"); // YYYY-MM-DD
  const data = dataParam ? new Date(dataParam) : new Date();
  const { dataInizio, dataFine } = getSettimana(data);
  const assegnazioni = await prisma.assegnazioneCantiere.findMany({
    where: {
      dipendenteId: dipendente.id,
      dataInizio: { lte: dataFine },
      dataFine: { gte: dataInizio },
    },
    include: {
      cantiere: { select: { id: true, nome: true } },
    },
    orderBy: { cantiere: { nome: "asc" } },
  });
  return NextResponse.json(assegnazioni);
}
