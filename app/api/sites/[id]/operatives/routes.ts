import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const siteId = String(params.id);
    const body = await request.json();
    const { operativeId, startDate, endDate } = body;

    // Prefer full site duration
    let dStart: Date | null = null;
    let dEnd: Date | null = null;
    try {
      const site = await prisma.constructionSite.findUnique({ where: { id: siteId }, select: { startDate: true, endDate: true } });
      if (site?.startDate && site?.endDate) {
        dStart = new Date(site.startDate);
        dEnd = new Date(site.endDate);
      }
    } catch {}
    if (!dStart || !dEnd) {
      dStart = new Date(startDate);
      dEnd = new Date(endDate);
    }

    let assignment: any
    try {
      assignment = await prisma.siteOperative.upsert({
        where: {
          siteId_operativeId_startDate: { siteId, operativeId: String(operativeId), startDate: dStart! },
        },
        update: { endDate: dEnd! },
        create: {
          siteId,
          operativeId: String(operativeId),
          startDate: dStart!,
          endDate: dEnd!,
        },
      });
    } catch (_e) {
      const existing = await prisma.siteOperative.findFirst({
        where: { siteId, operativeId: String(operativeId), startDate: dStart! },
      })
      if (existing) {
        assignment = await prisma.siteOperative.update({ where: { id: existing.id as any }, data: { endDate: dEnd! } })
      } else {
        assignment = await prisma.siteOperative.create({
          data: { siteId, operativeId: String(operativeId), startDate: dStart!, endDate: dEnd! },
        })
      }
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating site operative assignment:", error);
    return NextResponse.json({ error: "Failed to create site operative assignment" }, { status: 500 });
  }
}
