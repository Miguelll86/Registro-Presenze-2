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
  try {
    const body = await request.json();
    const { nome, indirizzo, responsabileId } = body;
    const existing = await prisma.cantiere.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cantiere non trovato" }, { status: 404 });
    }
    const data: { nome?: string; indirizzo?: string | null; responsabileId?: string | null } = {};
    if (nome !== undefined) data.nome = nome.trim();
    if (indirizzo !== undefined) data.indirizzo = indirizzo?.trim() || null;
    if (responsabileId !== undefined) data.responsabileId = responsabileId || null;
    const cantiere = await prisma.cantiere.update({
      where: { id },
      data,
      include: {
        responsabile: { select: { id: true, nome: true, cognome: true } },
      },
    });
    return NextResponse.json(cantiere);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento del cantiere" },
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
  const existing = await prisma.cantiere.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cantiere non trovato" }, { status: 404 });
  }
  await prisma.cantiere.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
