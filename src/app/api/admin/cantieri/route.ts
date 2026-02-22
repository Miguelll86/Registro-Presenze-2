import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const cantieri = await prisma.cantiere.findMany({
    orderBy: { nome: "asc" },
    include: {
      responsabile: { select: { id: true, nome: true, cognome: true } },
      _count: { select: { assegnazioni: true } },
    },
  });
  return NextResponse.json(cantieri);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { nome, indirizzo, responsabileId } = body;
    if (!nome?.trim()) {
      return NextResponse.json(
        { error: "Nome cantiere obbligatorio" },
        { status: 400 }
      );
    }
    const cantiere = await prisma.cantiere.create({
      data: {
        nome: nome.trim(),
        indirizzo: indirizzo?.trim() || null,
        responsabileId: responsabileId || null,
      },
      include: {
        responsabile: { select: { id: true, nome: true, cognome: true } },
      },
    });
    return NextResponse.json(cantiere);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nella creazione del cantiere" },
      { status: 500 }
    );
  }
}
