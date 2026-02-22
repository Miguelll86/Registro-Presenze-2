import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Restituisce lunedì e domenica della settimana che contiene la data. */
function getSettimana(data: Date): { dataInizio: Date; dataFine: Date } {
  const d = new Date(data);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // lunedì = 1
  const lunedi = new Date(d);
  lunedi.setDate(d.getDate() + diff);
  lunedi.setHours(0, 0, 0, 0);
  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);
  domenica.setHours(23, 59, 59, 999);
  return { dataInizio: lunedi, dataFine: domenica };
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const settimana = searchParams.get("settimana"); // YYYY-MM-DD (qualsiasi giorno della settimana)
  const cantiereId = searchParams.get("cantiereId");
  const where: { cantiereId?: string; AND?: Array<Record<string, unknown>> } = {};
  if (cantiereId) where.cantiereId = cantiereId;
  if (settimana) {
    const { dataInizio: weekStart, dataFine: weekEnd } = getSettimana(new Date(settimana));
    // Assegnazioni che si sovrappongono alla settimana (anche solo un giorno)
    where.AND = [
      { dataInizio: { lte: weekEnd } },
      { dataFine: { gte: weekStart } },
    ];
  }
  const assegnazioni = await prisma.assegnazioneCantiere.findMany({
    where,
    orderBy: [{ dataInizio: "desc" }, { cantiere: { nome: "asc" } }],
    include: {
      dipendente: { select: { id: true, nome: true, cognome: true } },
      cantiere: { select: { id: true, nome: true } },
    },
  });
  return NextResponse.json(assegnazioni);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { dipendenteId, cantiereId, dataInizio: dataInizioParam, dataFine: dataFineParam, dataSettimana } = body;
    if (!dipendenteId || !cantiereId) {
      return NextResponse.json(
        { error: "dipendenteId e cantiereId obbligatori" },
        { status: 400 }
      );
    }
    let dataInizio: Date;
    let dataFine: Date;
    if (dataInizioParam && dataFineParam) {
      dataInizio = new Date(dataInizioParam + "T00:00:00");
      dataFine = new Date(dataFineParam + "T23:59:59.999");
      if (dataInizio.getTime() > dataFine.getTime()) {
        return NextResponse.json(
          { error: "Data inizio deve essere uguale o precedente a data fine" },
          { status: 400 }
        );
      }
    } else if (dataSettimana) {
      const week = getSettimana(new Date(dataSettimana));
      dataInizio = week.dataInizio;
      dataFine = week.dataFine;
    } else {
      return NextResponse.json(
        { error: "Indica data inizio e data fine, oppure data settimana" },
        { status: 400 }
      );
    }
    const assegnazione = await prisma.assegnazioneCantiere.create({
      data: { dipendenteId, cantiereId, dataInizio, dataFine },
      include: {
        dipendente: { select: { id: true, nome: true, cognome: true } },
        cantiere: { select: { id: true, nome: true } },
      },
    });
    return NextResponse.json(assegnazione);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nella creazione dell'assegnazione" },
      { status: 500 }
    );
  }
}
