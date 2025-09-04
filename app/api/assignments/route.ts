import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const assignments = await prisma.siteOperative.findMany({
      include: { operative: true, site: true },
    })
    return NextResponse.json(assignments)
  } catch (err) {
    console.error("GET /assignments failed:", err)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { operativeId, siteId, startDate, endDate } = body

    // validate
    if (!operativeId || !siteId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const created = await prisma.siteOperative.create({
      data: {
        operativeId: Number(operativeId),
        siteId: Number(siteId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: { operative: true },
    })

    return NextResponse.json(created)
  } catch (err) {
    console.error("POST /assignments failed:", err)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    await prisma.siteOperative.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /assignments failed:", err)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}
