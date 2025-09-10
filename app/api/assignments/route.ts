import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Fallback status computation for legacy rows without status column
function computeTemporalStatus(row: { startDate: Date | string; endDate: Date | string }) {
  const now = new Date(); now.setHours(0,0,0,0)
  const start = new Date(row.startDate)
  const end = new Date(row.endDate)
  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    if (start <= now && now <= end) return "DEPLOYED"
    if (end < now) return "OFFSITE"
  }
  return "ASSIGNED"
}

export async function GET() {
  try {
    const rows = await prisma.siteOperative.findMany({
      include: { operative: true, site: true },
      orderBy: { id: "desc" },
    })
    const withStatus = rows.map((r: any) => ({ ...r, status: r.status || computeTemporalStatus(r) }))
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
    // Try to create with status; if schema is not migrated yet, retry without status
    let created: any
    try {
      created = await prisma.siteOperative.create({
        data: {
          operativeId: String(operativeId),
          siteId: String(siteId),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "ASSIGNED" as any,
        },
        include: { operative: true, site: true },
      })
    } catch (_e) {
      created = await prisma.siteOperative.create({
        data: {
          operativeId: String(operativeId),
          siteId: String(siteId),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
        include: { operative: true, site: true },
      })
    }

    return NextResponse.json({ ...created, status: created.status || computeTemporalStatus(created) })
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

    const data: any = {}
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)
    if (typeof status === "string") {
      const desired = String(status).toUpperCase()
      if (["AVAILABLE", "ASSIGNED", "DEPLOYED", "OFFSITE"].includes(desired)) {
        data.status = desired as any
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
    }

    let updated: any
    try {
      updated = await prisma.siteOperative.update({
        where: { id: Number(id) },
        data,
        include: { operative: true, site: true },
      })
    } catch (_e) {
      // Retry without status key if schema lacks the column yet
      const { status: desiredStatus, ...dataNoStatus } = data as any

      // If no other fields to update, emulate status change via dates
      if (Object.keys(dataNoStatus).length === 0 && typeof desiredStatus === "string") {
        const existing = await prisma.siteOperative.findUnique({ where: { id: Number(id) } })
        if (!existing) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
        const now = new Date(); now.setHours(0,0,0,0)
        let patch: any = {}
        const want = String(desiredStatus).toUpperCase()
        if (want === "DEPLOYED") {
          const s = new Date(existing.startDate); s.setHours(0,0,0,0)
          const e = new Date(existing.endDate);   e.setHours(0,0,0,0)
          patch.startDate = s > now ? now : s
          patch.endDate = e < now ? now : e
        } else if (want === "ASSIGNED") {
          // push start into the future (tomorrow) so it's not currently active
          const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
          patch.startDate = tomorrow
          // keep end date at least start
          const e = new Date(existing.endDate); e.setHours(0,0,0,0)
          patch.endDate = e < tomorrow ? tomorrow : e
        } else if (want === "OFFSITE") {
          // make the assignment end yesterday so it is not considered active or assigned today
          const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
          patch.endDate = yesterday
        }

        updated = await prisma.siteOperative.update({
          where: { id: Number(id) },
          data: patch,
          include: { operative: true, site: true },
        })
      } else {
        updated = await prisma.siteOperative.update({
          where: { id: Number(id) },
          data: dataNoStatus,
          include: { operative: true, site: true },
        })
      }
    }
    return NextResponse.json({ ...updated, status: updated.status || computeTemporalStatus(updated) })
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
