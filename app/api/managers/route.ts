import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";


export async function GET() {
  const managers = await prisma.manager.findMany();
  return NextResponse.json(managers);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const manager = await prisma.manager.create({ data });
  return NextResponse.json(manager, { status: 201 });
}
