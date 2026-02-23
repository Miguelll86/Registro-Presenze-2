import { NextResponse } from "next/server";
import { requireResponsabileCantiere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Dettaglio di un rapportino (per rigenerare PDF dall'archivio). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const responsabile = await requireResponsabileCantiere();
  if (!responsabile) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { id } = await params;
  const rapportino = await prisma.rapportino.findUnique({
    where: { id },
    include: {
      cantiere: { select: { id: true, nome: true } },
    },
  });

  if (!rapportino) {
    return NextResponse.json({ error: "Rapportino non trovato" }, { status: 404 });
  }

  const cantieriIds = await prisma.cantiere
    .findMany({
      where: { responsabileId: responsabile.id },
      select: { id: true },
    })
    .then((r) => r.map((c) => c.id));
  if (!cantieriIds.includes(rapportino.cantiereId)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  return NextResponse.json(rapportino);
}
