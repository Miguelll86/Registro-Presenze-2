import { NextResponse } from "next/server";
import { requireResponsabileCantiere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Responsabile di cantiere: elenco cantieri di cui è responsabile. */
export async function GET() {
  const responsabile = await requireResponsabileCantiere();
  if (!responsabile) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const cantieri = await prisma.cantiere.findMany({
    where: { responsabileId: responsabile.id },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, indirizzo: true },
  });
  return NextResponse.json(cantieri);
}
