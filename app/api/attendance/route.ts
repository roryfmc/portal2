// app/api/attendance/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // adjust to your prisma import

// --- utils ---
// app/api/attendance/route.ts
// utilities
const pad = (n: number) => String(n).padStart(2, "0")
const toLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  dt.setHours(0, 0, 0, 0)
  return dt
}
const boundsForDay = (iso: string) => {
  const start = toLocalDate(iso)
  const end = new Date(start)
  end.setDate(start.getDate() + 1) // exclusive upper bound
  return { start, end }
}
const dateToLocalISO = (dt: Date) =>
  `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

// GET ?siteId&operativeId&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get("siteId") || ""
  const operativeId = searchParams.get("operativeId") || ""
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (!siteId || !operativeId || !startDate || !endDate) {
    return NextResponse.json({ error: "siteId, operativeId, startDate, endDate are required" }, { status: 400 })
  }

  const gte = toLocalDate(startDate)
  const { end: lt } = boundsForDay(endDate)

  const rows = await prisma.dailyAttendance.findMany({
    where: { siteId, operativeId, date: { gte, lt } }, // lt end-of-day (exclusive)
    select: { date: true },
    orderBy: { date: "asc" },
  })

  return NextResponse.json(
    rows.map(r => ({ date: dateToLocalISO(r.date), present: true }))
  )
}

// POST { siteId, operativeId, date:'YYYY-MM-DD', present?: boolean }
export async function POST(req: Request) {
  const { siteId, operativeId, date, present } = await req.json()
  if (!siteId || !operativeId || !date) {
    return NextResponse.json({ error: "siteId, operativeId, date required" }, { status: 400 })
  }

  const { start, end } = boundsForDay(date)

  // If caller sends present:false to POST, treat as delete
  if (present === false) {
    const del = await prisma.dailyAttendance.deleteMany({
      where: { siteId, operativeId, date: { gte: start, lt: end } },
    })
    return NextResponse.json({ ok: true, deleted: del.count })
  }

  // Create if missing (existence == present)
  const existing = await prisma.dailyAttendance.findFirst({
    where: { siteId, operativeId, date: { gte: start, lt: end } },
    select: { id: true },
  })
  if (!existing) {
    await prisma.dailyAttendance.create({ data: { siteId, operativeId, date: start } })
    return NextResponse.json({ ok: true, created: true })
  }
  return NextResponse.json({ ok: true, created: false })
}

// PUT behaves like POST (idempotent "mark present")
export async function PUT(req: Request) { return POST(req) }

// DELETE ?siteId&operativeId&date=YYYY-MM-DD
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get("siteId") || ""
  const operativeId = searchParams.get("operativeId") || ""
  const date = searchParams.get("date")

  if (!siteId || !operativeId || !date) {
    return NextResponse.json({ error: "siteId, operativeId, date required" }, { status: 400 })
  }

  const { start, end } = boundsForDay(date)
  const del = await prisma.dailyAttendance.deleteMany({
    where: { siteId, operativeId, date: { gte: start, lt: end } },
  })
  return NextResponse.json({ ok: true, deleted: del.count })
}
