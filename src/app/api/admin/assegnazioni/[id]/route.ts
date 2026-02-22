import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.assegnazioneCantiere.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Assegnazione non trovata" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const { dipendenteId, cantiereId, dataInizio: dataInizioParam, dataFine: dataFineParam } = body;
    const data: { dipendenteId?: string; cantiereId?: string; dataInizio?: Date; dataFine?: Date } = {};
    if (dipendenteId) data.dipendenteId = dipendenteId;
    if (cantiereId) data.cantiereId = cantiereId;
    if (dataInizioParam) data.dataInizio = new Date(dataInizioParam + "T00:00:00");
    if (dataFineParam) data.dataFine = new Date(dataFineParam + "T23:59:59.999");
    if (data.dataInizio && data.dataFine && data.dataInizio.getTime() > data.dataFine.getTime()) {
      return NextResponse.json(
        { error: "Data inizio deve essere uguale o precedente a data fine" },
        { status: 400 }
      );
    }
    const assegnazione = await prisma.assegnazioneCantiere.update({
      where: { id },
      data,
      include: {
        dipendente: { select: { id: true, nome: true, cognome: true } },
        cantiere: { select: { id: true, nome: true } },
      },
    });
    return NextResponse.json(assegnazione);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.assegnazioneCantiere.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Assegnazione non trovata" }, { status: 404 });
  }
  await prisma.assegnazioneCantiere.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
