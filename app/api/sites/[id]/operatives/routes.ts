import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const siteId = Number(params.id);
    const body = await request.json();
    const { operativeId, startDate, endDate } = body;

    const assignment = await prisma.siteOperative.create({ // 
      data: {
        siteId,
        operativeId: Number(operativeId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating site operative assignment:", error);
    return NextResponse.json({ error: "Failed to create site operative assignment" }, { status: 500 });
  }
}
