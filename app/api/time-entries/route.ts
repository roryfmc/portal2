// app/api/time-entries/route.ts
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

// --- date helpers (local-day safe) ---
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
  end.setDate(start.getDate() + 1)
  return { start, end }
}
const localISO = (dt: Date) =>
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

  const rows = await prisma.timeEntry.findMany({
    where: { siteId, operativeId, date: { gte, lt } },
    orderBy: { date: "asc" },
  })

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      operativeId: r.operativeId,
      date: localISO(r.date),
      startTime: r.startTime,
      endTime: r.endTime,
      breakDuration: r.breakDuration, // minutes
      totalHours: Number(r.totalHours),
      hourlyRate: r.hourlyRate ? Number(r.hourlyRate) : null,
      status: r.status,
      notes: r.notes ?? "",
    }))
  )
}

// POST { entries: Array<...> }  (batch upsert by siteId+operativeId+date)
// We only upsert records for dates you send (no deletions here).
export async function POST(req: Request) {
  const body = await req.json()
  type Entry = {
    siteId: string
    operativeId: string
    date: string // YYYY-MM-DD
    startTime: string // HH:mm
    endTime: string   // HH:mm
    breakDuration?: number // minutes
    hourlyRate?: number | null
    notes?: string
    status?: "pending" | "approved" | "rejected"
  }
  const entries: Entry[] = Array.isArray(body?.entries)
    ? (body.entries as Entry[])
    : (body && body.siteId ? [body as Entry] : [])

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries array required or single entry object" }, { status: 400 })
  }

  // util to compute hours
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const results = []
  for (const e of entries) {
    if (!e.siteId || !e.operativeId || !e.date || !e.startTime || !e.endTime) continue

    const when = toLocalDate(e.date)
    const mins = Math.max(0, toMin(e.endTime) - toMin(e.startTime) - (e.breakDuration || 0))
    const hours = Math.round((mins / 60) * 100) / 100

    // upsert on (siteId, operativeId, date) — make sure you have a unique on these three in Prisma
    const saved = await prisma.timeEntry.upsert({
      where: { siteId_operativeId_date: { siteId: e.siteId, operativeId: e.operativeId, date: when } },
      update: {
        startTime: e.startTime,
        endTime: e.endTime,
        breakDuration: e.breakDuration || 0,
        totalHours: hours,
        hourlyRate: e.hourlyRate ?? null,
        notes: e.notes ?? null,
        status: e.status ?? "pending",
      },
      create: {
        siteId: e.siteId,
        operativeId: e.operativeId,
        date: when,
        startTime: e.startTime,
        endTime: e.endTime,
        breakDuration: e.breakDuration || 0,
        totalHours: hours,
        hourlyRate: e.hourlyRate ?? null,
        notes: e.notes ?? null,
        status: e.status ?? "pending",
      },
    })
    results.push(saved.id)
  }

  return NextResponse.json({ ok: true, count: results.length })
}

// PUT ?id=...  with JSON body patch
export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const patch = await req.json()

  // Recompute totalHours if time fields change
  const toMin = (hhmm: string) => {
    const [h, m] = String(hhmm).split(":").map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  // Load existing to merge date if needed
  const existing = await prisma.timeEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

  const nextStart = patch.startTime ?? existing.startTime
  const nextEnd = patch.endTime ?? existing.endTime
  const nextBreak = patch.breakDuration ?? existing.breakDuration
  let totalHours = existing.totalHours
  if (patch.startTime != null || patch.endTime != null || patch.breakDuration != null) {
    const mins = Math.max(0, toMin(nextEnd) - toMin(nextStart) - (nextBreak || 0))
    totalHours = new Prisma.Decimal(Math.round((mins / 60) * 100) / 100)
  }

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      startTime: nextStart,
      endTime: nextEnd,
      breakDuration: nextBreak,
      totalHours,
      hourlyRate: patch.hourlyRate ?? existing.hourlyRate,
      notes: patch.notes ?? existing.notes,
      status: patch.status ?? existing.status,
    },
  })

  return NextResponse.json({ id: updated.id })
}
