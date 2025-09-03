import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";


export async function GET() {
  const sites = await prisma.constructionSite.findMany();
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const site = await prisma.constructionSite.create({ data });
  return NextResponse.json(site, { status: 201 });
}
