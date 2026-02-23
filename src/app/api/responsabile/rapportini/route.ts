import { NextResponse } from "next/server";
import { requireResponsabileCantiere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Lista rapportini salvati per i cantieri di cui è responsabile. */
export async function GET(request: Request) {
  const responsabile = await requireResponsabileCantiere();
  if (!responsabile) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const cantieriIds = await prisma.cantiere
    .findMany({
      where: { responsabileId: responsabile.id },
      select: { id: true },
    })
    .then((r) => r.map((c) => c.id));
  if (cantieriIds.length === 0) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const dataDa = searchParams.get("dataDa"); // YYYY-MM-DD
  const dataA = searchParams.get("dataA");
  const cantiereId = searchParams.get("cantiereId");

  const where: { cantiereId: string | { in: string[] }; data?: { gte?: Date; lte?: Date } } = {
    cantiereId: cantiereId && cantieriIds.includes(cantiereId) ? cantiereId : { in: cantieriIds },
  };
  if (dataDa || dataA) {
    where.data = {};
    if (dataDa) where.data.gte = new Date(dataDa + "T00:00:00");
    if (dataA) where.data.lte = new Date(dataA + "T23:59:59.999");
  }

  const rapportini = await prisma.rapportino.findMany({
    where,
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      data: true,
      dataFine: true,
      descrizioneLavori: true,
      createdAt: true,
      cantiereId: true,
      cantiere: { select: { id: true, nome: true } },
      responsabile: { select: { id: true, nome: true, cognome: true } },
    },
  });

  return NextResponse.json(rapportini);
}

/** Salva un nuovo rapportino (chiamato dopo Genera PDF). */
export async function POST(request: Request) {
  const responsabile = await requireResponsabileCantiere();
  if (!responsabile) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const cantieriIds = await prisma.cantiere
    .findMany({
      where: { responsabileId: responsabile.id },
      select: { id: true },
    })
    .then((r) => r.map((c) => c.id));

  try {
    const body = await request.json();
    const {
      data,
      dataFine,
      cantiereId,
      descrizioneLavori,
      firmaResponsabile,
      firmaVisore,
      righe,
    } = body;

    if (!data || !cantiereId) {
      return NextResponse.json(
        { error: "data e cantiereId obbligatori" },
        { status: 400 }
      );
    }
    if (!cantieriIds.includes(cantiereId)) {
      return NextResponse.json({ error: "Cantiere non autorizzato" }, { status: 403 });
    }

    const dataDate = new Date(data + "T12:00:00");
    let dataFineDate: Date | null = null;
    let righePayload: unknown = righe;

    if (dataFine) {
      dataFineDate = new Date(dataFine + "T12:00:00");
      if (dataFineDate.getTime() < dataDate.getTime()) {
        return NextResponse.json(
          { error: "La data fine deve essere uguale o successiva alla data inizio" },
          { status: 400 }
        );
      }
      if (!righe?.giorni || !Array.isArray(righe.giorni)) {
        return NextResponse.json(
          { error: "Per il rapportino di periodo è richiesto righe.giorni (array)" },
          { status: 400 }
        );
      }
    } else {
      if (!righe || !Array.isArray(righe)) {
        return NextResponse.json(
          { error: "righe obbligatorio (array per rapportino giornaliero)" },
          { status: 400 }
        );
      }
    }

    const rapportino = await prisma.rapportino.create({
      data: {
        data: dataDate,
        dataFine: dataFineDate,
        cantiereId,
        responsabileId: responsabile.id,
        descrizioneLavori: descrizioneLavori?.trim() || null,
        firmaResponsabile: firmaResponsabile || null,
        firmaVisore: firmaVisore || null,
        righe: righePayload as object,
      },
      include: {
        cantiere: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json(rapportino);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nel salvataggio del rapportino" },
      { status: 500 }
    );
  }
}
