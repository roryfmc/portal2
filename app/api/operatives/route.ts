import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const operatives = await prisma.operative.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sites: {
          include: {
            site: true, // include site details
          },
        },
      },
    });
    return NextResponse.json(operatives);
  } catch (error) {
    console.error("Error fetching operatives:", error);
    return NextResponse.json({ error: "Failed to fetch operatives" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, trade} = body

    const operative = await prisma.operative.create({
      data: {
        name,
        email,
        phone,
        trade,
        status: "available",
      },
    })

    return NextResponse.json(operative, { status: 201 })
  } catch (error) {
    console.error("Error creating operative:", error)
    return NextResponse.json({ error: "Failed to create operative" }, { status: 500 })
  }
}
