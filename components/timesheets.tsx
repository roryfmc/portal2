"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { Clock, Users, Building, Save, Calculator, CheckCircle, AlertCircle } from "lucide-react"
import type { ConstructionSite, Operative, Client, SiteOperative, TimeEntry, TimeEntryStatus } from "@/lib/types"

// ----------------- helpers aligned with SiteManagement -----------------

const toLocalISO = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const mondayOf = (anyDateISO: string) => {
  const d = new Date(anyDateISO)
  d.setHours(0, 0, 0, 0)
  const diffToMon = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diffToMon)
  return toLocalISO(d)
}

const getWeekDates = (weekStartISO: string) => {
  const dates: string[] = []
  const start = new Date(weekStartISO)
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(toLocalISO(d))
  }
  return dates
}

const pad2 = (n: number) => String(n).padStart(2, "0")

const hoursToEndTime = (base = "08:00", hours = 8) => {
  // Base start at 08:00; add fractional hours to compute end time
  const [bh, bm] = base.split(":").map(Number)
  const totalMinutes = bh * 60 + bm + Math.round(hours * 60)
  const hh = Math.floor(totalMinutes / 60) % 24
  const mm = totalMinutes % 60
  return `${pad2(hh)}:${pad2(mm)}`
}

// ----------------- component -----------------

type WeeklyTimeEntry = {
  operativeId: string
  siteId: string
  weekStarting: string // Monday (YYYY-MM-DD)
  dailyHours: Record<string, number>
  totalHours: number
  notes: string
}

export default function TimesheetsPage() {
  // core data shared with SiteManagement
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<SiteOperative[]>([])

  // attendance (shared semantics with SiteManagement; if you add server persistence, this page will read it)
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({})

  // time entries (local list + API)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])

  // week selection
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = toLocalISO(new Date())
    return mondayOf(today)
  })

  const [weeklyEntries, setWeeklyEntries] = useState<Record<string, WeeklyTimeEntry>>({})
  const [savedEntries, setSavedEntries] = useState<Set<string>>(new Set())

  // fetchers (same endpoints your SiteManagement uses)
  useEffect(() => {
    const load = async () => {
      try {
        const [opsRes, sitesRes, clientsRes, assignsRes] = await Promise.all([
          fetch("/api/operatives"),
          fetch("/api/sites"),
          fetch("/api/clients"),
          fetch("/api/assignments"),
        ])
        if (opsRes.ok) setOperatives(await opsRes.json())
        if (sitesRes.ok) {
          const s = await sitesRes.json()
          setSites(
            s.map((x: any) => ({
              ...x,
              startDate: new Date(x.startDate),
              endDate: new Date(x.endDate),
              createdAt: x.createdAt ? new Date(x.createdAt) : new Date(),
            })),
          )
        }
        if (clientsRes.ok) setClients(await clientsRes.json())
        if (assignsRes.ok) setAssignments(await assignsRes.json())
      } catch (e) {
        console.error("Failed to load timesheet data:", e)
      }
    }
    load()
  }, [])

  // ---------- “current” operatives on a site (DEPLOYED) ----------
  const getOperativesByStatus = (siteId: string, status: "current" | "assigned" | "offsite") => {
    const statusFilter = (s: string) => {
      const up = String(s || "").toUpperCase()
      if (status === "current") return up === "DEPLOYED"
      if (status === "assigned") return up === "ASSIGNED"
      return up === "OFFSITE"
    }

    const operativeIds = new Set(
      assignments
        .filter((a) => String(a.siteId) === String(siteId) && statusFilter(String((a as any).status)))
        .map((a) => String(a.operativeId)),
    )

    return operatives.filter((o) => operativeIds.has(String(o.id)))
  }

  // ---------- attendance (same key shape as SiteManagement) ----------
  const getDailyAttendance = (siteId: string, operativeId: string, dateISO: string) => {
    const key = `${siteId}::${operativeId}::${dateISO}`
    return Boolean(attendanceMap[key])
  }

  // If you enable server persistence, uncomment the POST and wire your API (same structure SiteManagement commented)
//   const persistAttendance = async (siteId: string, operativeId: string, dateISO: string, present: boolean) => {
//     await fetch("/api/attendance", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ siteId, operativeId, date: dateISO, present }),
//     })
//   }

  const setAttendance = async (siteId: string, operativeId: string, dateISO: string, present: boolean) => {
    const key = `${siteId}::${operativeId}::${dateISO}`
    setAttendanceMap((prev) => ({ ...prev, [key]: present }))
    // await persistAttendance(siteId, operativeId, dateISO, present)
  }

  // Preload this week’s attendance if you later have an API. (Keeps parity with SiteManagement if persisted.)
  useEffect(() => {
    // Example shape if you add GET /api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
    // const from = selectedWeek
    // const to = getWeekDates(selectedWeek)[6]
    // fetch(`/api/attendance?from=${from}&to=${to}`)
    //   .then(r => r.ok ? r.json() : [])
    //   .then((rows: AttendanceRecord[]) => {
    //     const map: Record<string, boolean> = {}
    //     for (const r of rows) map[`${r.siteId}::${r.operativeId}::${r.date}`] = !!r.present
    //     setAttendanceMap(map)
    //   })
    //   .catch(() => {})
  }, [selectedWeek])

  // ---------- active sites: any DEPLOYED on that site ----------
  const activeSites = useMemo(() => {
    const bySite = new Map<string, number>()
    for (const a of assignments) {
      const st = String((a as any).status || "").toUpperCase()
      if (st === "DEPLOYED") bySite.set(String(a.siteId), 1)
    }
    return sites.filter((s) => bySite.has(String(s.id)))
  }, [assignments, sites])

  // ---------- weekly calc + UI handlers ----------
  const weekDates = getWeekDates(selectedWeek)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const handleWeeklyEntryChange = (operativeId: string, siteId: string, date: string, hours: number) => {
    const key = `${operativeId}-${siteId}`
    const wasPresent = getDailyAttendance(siteId, operativeId, date)
    if (!wasPresent && hours > 0) {
      alert(`Cannot add hours for ${date} — operative was not marked present`)
      return
    }

    setWeeklyEntries((prev) => {
      const current: WeeklyTimeEntry =
        prev[key] || { operativeId, siteId, weekStarting: selectedWeek, dailyHours: {}, totalHours: 0, notes: "" }
      const nextDaily = { ...current.dailyHours, [date]: hours }
      const totalHours = Object.values(nextDaily).reduce((s, h) => s + (h || 0), 0)
      return { ...prev, [key]: { ...current, dailyHours: nextDaily, totalHours } }
    })
    setSavedEntries((prev) => {
      const ns = new Set(prev)
      ns.delete(key)
      return ns
    })
  }

  const handleNotesChange = (operativeId: string, siteId: string, notes: string) => {
    const key = `${operativeId}-${siteId}`
    setWeeklyEntries((prev) => {
      const current = prev[key] || { operativeId, siteId, weekStarting: selectedWeek, dailyHours: {}, totalHours: 0, notes: "" }
      return { ...prev, [key]: { ...current, notes } }
    })
  }

  // minimal API for time entries; if you don’t have these endpoints yet, this will still update local state
  const addTimeEntry = async (entry: Omit<TimeEntry, "id">) => {
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      })
      if (res.ok) {
        const saved = (await res.json()) as TimeEntry
        setTimeEntries((prev) => [saved, ...prev])
        return
      }
    } catch {}
    // fallback: local
    setTimeEntries((prev) => [{ id: crypto.randomUUID(), ...entry }, ...prev])
  }

  const updateTimeEntry = async (id: string, patch: Partial<TimeEntry>) => {
    try {
      const res = await fetch(`/api/time-entries?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const saved = (await res.json()) as TimeEntry
        setTimeEntries((prev) => prev.map((t) => (t.id === id ? saved : t)))
        return
      }
    } catch {}
    setTimeEntries((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as TimeEntry : t)))
  }

  const saveWeeklyEntry = async (operativeId: string, siteId: string) => {
    const key = `${operativeId}-${siteId}`
    const entry = weeklyEntries[key]
    if (!entry || entry.totalHours <= 0) {
      alert("Please enter hours for at least one day")
      return
    }

    const op = operatives.find((o) => String(o.id) === String(operativeId))
    const hourlyRate = (op as any)?.hourlyRate || 0

    for (const [date, hours] of Object.entries(entry.dailyHours)) {
      if (!hours || hours <= 0) continue
      await addTimeEntry({
        operativeId,
        siteId,
        date,
        startTime: "08:00",
        endTime: hoursToEndTime("08:00", hours),
        breakDuration: 0,
        totalHours: hours,
        hourlyRate,
        status: "pending" as TimeEntryStatus,
        notes: entry.notes || "",
      })
    }
    setSavedEntries((prev) => new Set([...prev, key]))
  }

  const saveAllEntries = async () => {
    const keys = Object.keys(weeklyEntries)
    for (const key of keys) {
      if (!savedEntries.has(key)) {
        const [operativeId, siteId] = key.split("-")
        // eslint-disable-next-line no-await-in-loop
        await saveWeeklyEntry(operativeId, siteId)
      }
    }
  }

  const getAttendanceForWeek = (operativeId: string, siteId: string) =>
    weekDates.map((date) => ({ date, present: getDailyAttendance(siteId, operativeId, date) }))

  const getTotalHoursForSite = (siteId: string) =>
    Object.entries(weeklyEntries)
      .filter(([key]) => key.endsWith(`-${siteId}`))
      .reduce((sum, [, e]) => sum + e.totalHours, 0)

  const getTotalPayForSite = (siteId: string) =>
    Object.entries(weeklyEntries)
      .filter(([key]) => key.endsWith(`-${siteId}`))
      .reduce((sum, [key, e]) => {
        const operativeId = key.split("-")[0]
        const op = operatives.find((o) => String(o.id) === String(operativeId))
        const rate = (op as any)?.hourlyRate || 0
        return sum + e.totalHours * rate
      }, 0)

  // ----------------- UI -----------------

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="min-h-screen ">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Weekly Timesheet Portal</h1>
        <p className="text-slate-600 mt-2">Weekly hour entry based on daily attendance tracking</p>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <Label htmlFor="week">Week Starting:</Label>
              <Input
                id="week"
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(mondayOf(e.target.value))}
                className="w-40"
              />
            </div>
            <Button onClick={saveAllEntries} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save All Weekly Entries
            </Button>
          </div>
        </div>

        {activeSites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No active operatives this week</h3>
              <p className="text-slate-600 text-center">
                Move operatives to “This Week” (DEPLOYED) on the Sites page to start tracking their hours
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeSites.map((site) => {
              const client = clients.find((c) => Number(c.id) === Number(site.clientId))
              const currentOps = getOperativesByStatus(site.id, "current")
              const siteHours = getTotalHoursForSite(site.id)
              const sitePay = getTotalPayForSite(site.id)

              return (
                <Card key={site.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-orange-600" />
                          {site.name}
                        </CardTitle>
                        <CardDescription>
                          {client?.name} — {site.address}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {currentOps.length} Active
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {siteHours.toFixed(1)}h Total
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calculator className="w-3 h-3" />£{sitePay.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-8 gap-2 mb-4">
                        <div className="font-medium text-sm text-slate-600">Operative</div>
                        {weekDates.map((date, idx) => (
                          <div key={date} className="text-center">
                            <div className="font-medium text-sm text-slate-900">{dayLabels[idx]}</div>
                            <div className="text-xs text-slate-500">{new Date(date).getDate()}</div>
                          </div>
                        ))}
                      </div>

                      {currentOps.map((op) => {
                        const key = `${op.id}-${site.id}`
                        const entry =
                          weeklyEntries[key] || {
                            operativeId: op.id,
                            siteId: site.id,
                            weekStarting: selectedWeek,
                            dailyHours: {},
                            totalHours: 0,
                            notes: "",
                          }
                        const attendance = getAttendanceForWeek(op.id, site.id)
                        const rate = (op as any)?.hourlyRate || 0
                        const weeklyPay = entry.totalHours * rate
                        const isSaved = savedEntries.has(key)

                        return (
                          <div key={key} className="border rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-slate-900">
                                  {op.personalDetails?.fullName ?? op.id}
                                </h4>
                                <p className="text-sm text-slate-600">£{rate}/hour</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSaved ? (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Saved
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Unsaved
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => saveWeeklyEntry(op.id, site.id)}
                                  disabled={isSaved || entry.totalHours <= 0}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-8 gap-2 mb-4">
                              <div className="flex items-center text-sm font-medium">Daily Hours:</div>
                              {attendance.map(({ date, present }) => (
                                <div key={`${key}-${date}`} className="space-y-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={12}
                                    step={0.5}
                                    value={entry.dailyHours[date] ?? ""}
                                    onChange={(e) =>
                                      handleWeeklyEntryChange(
                                        op.id,
                                        site.id,
                                        date,
                                        Number.isFinite(+e.target.value) ? Number(e.target.value) : 0,
                                      )
                                    }
                                    disabled={!present || isSaved}
                                    className={`text-center text-sm ${
                                      !present ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                                    }`}
                                    placeholder={present ? "0" : "N/A"}
                                  />
                                  <div className="text-xs text-center">
                                    {present ? (
                                      <Badge variant="secondary" className="text-xs px-1 py-0">
                                        Present
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs px-1 py-0">
                                        Absent
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Total Weekly Hours</Label>
                                <div className="h-10 px-3 py-2 border rounded-md bg-slate-50 flex items-center">
                                  <span className="font-medium">{entry.totalHours.toFixed(1)}h</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Weekly Pay</Label>
                                <div className="h-10 px-3 py-2 border rounded-md bg-green-50 flex items-center">
                                  <span className="font-medium text-green-700">£{weeklyPay.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`notes-${key}`}>Weekly Notes</Label>
                                <Textarea
                                  id={`notes-${key}`}
                                  placeholder="Optional weekly notes..."
                                  value={entry.notes}
                                  onChange={(e) => handleNotesChange(op.id, site.id, e.target.value)}
                                  disabled={isSaved}
                                  className="min-h-[40px]"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
