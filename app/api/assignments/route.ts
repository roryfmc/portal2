import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper to compute an assignment-like status from SiteOperative dates
function computeStatus(row: { startDate: Date | string; endDate: Date | string }) {
  const now = new Date(); now.setHours(0,0,0,0)
  const start = new Date(row.startDate)
  const end = new Date(row.endDate)
  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    if (start <= now && now <= end) return "ACTIVE"
    if (end < now) return "COMPLETED"
  }
  return "SCHEDULED"
}

export async function GET() {
  try {
    const rows = await prisma.siteOperative.findMany({
      include: { operative: true, site: true },
      orderBy: { id: "desc" },
    })
    const withStatus = rows.map((r) => ({ ...r, status: computeStatus(r) }))
    return NextResponse.json(withStatus)
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

    // IDs are UUID strings in the schema. Do NOT cast to Number.
    const created = await prisma.siteOperative.create({
      data: {
        operativeId: String(operativeId),
        siteId: String(siteId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: { operative: true, site: true },
    })

    return NextResponse.json({ ...created, status: computeStatus(created) })
  } catch (err) {
    console.error("POST /assignments failed:", err)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { startDate, endDate, status } = body || {}

    // Build an update payload for SiteOperative (no native status column)
    const data: any = {}
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)

    if (!startDate && !endDate && typeof status === "string") {
      const desired = String(status).toUpperCase()
      if (desired === "ACTIVE") {
        // Ensure the assignment covers today by pulling startDate to today if it's in the future
        const existing = await prisma.siteOperative.findUnique({ where: { id: Number(id) } })
        if (!existing) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        const now = new Date(); now.setHours(0,0,0,0)
        const currentStart = new Date(existing.startDate)
        const currentEnd = new Date(existing.endDate)
        // If start is after now, bring it forward to today
        data.startDate = currentStart > now ? now : currentStart
        // If end is before start (or before now), push to at least today
        if (currentEnd < data.startDate) {
          data.endDate = now
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
    }

    const updated = await prisma.siteOperative.update({
      where: { id: Number(id) },
      data,
      include: { operative: true, site: true },
    })
    return NextResponse.json({ ...updated, status: computeStatus(updated) })
  } catch (err) {
    console.error("PUT /assignments failed:", err)
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
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
