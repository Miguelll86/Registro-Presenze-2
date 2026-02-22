import { NextResponse } from "next/server";
import { requireResponsabileCantiere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Responsabile di cantiere: timbrature (entrate/uscite) dei dipendenti per i cantieri di cui è responsabile, filtrate per data e opzionalmente per cantiere. */
export async function GET(request: Request) {
  const responsabile = await requireResponsabileCantiere();
  if (!responsabile) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dataParam = searchParams.get("data"); // YYYY-MM-DD
  const cantiereId = searchParams.get("cantiereId");

  if (!dataParam) {
    return NextResponse.json(
      { error: "Parametro data (YYYY-MM-DD) obbligatorio" },
      { status: 400 }
    );
  }

  const dataInizio = new Date(dataParam + "T00:00:00");
  const dataFine = new Date(dataParam + "T23:59:59.999");

  const cantieriResp = await prisma.cantiere.findMany({
    where: { responsabileId: responsabile.id },
    select: { id: true },
  });
  const cantiereIds = cantieriResp.map((c) => c.id);
  if (cantiereIds.length === 0) {
    return NextResponse.json([]);
  }

  const where: {
    cantiereId: string | { in: string[] };
    createdAt: { gte: Date; lte: Date };
  } = {
    cantiereId: cantiereId && cantiereIds.includes(cantiereId) ? cantiereId : { in: cantiereIds },
    createdAt: { gte: dataInizio, lte: dataFine },
  };

  const timbrature = await prisma.timbratura.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      dipendente: { select: { id: true, nome: true, cognome: true } },
      cantiere: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(timbrature);
}
