"use client"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  MapPin,
  HardHat,
  Building2,
  AlertTriangle,
  PoundSterling,
} from "lucide-react"
import type { ConstructionSite, Operative, Client } from "@/lib/types"

type SiteFilter = "all" | "unfulfilled" | "active"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [loadingSites, setLoadingSites] = useState(false)

  const [operatives, setOperatives] = useState<Operative[]>([])
  const [loadingOperatives, setLoadingOperatives] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

  const [siteFilter, setSiteFilter] = useState<SiteFilter>("all")

  // ---- Fetch data ----
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true)
        const res = await fetch("/api/sites")
        if (!res.ok) return
        const data = await res.json()
        setSites(
          data.map((s: any) => ({
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          })),
        )
      } catch (e) {
        console.error("Failed to fetch sites for calendar:", e)
      } finally {
        setLoadingSites(false)
      }
    }
    fetchSites()
  }, [])

  useEffect(() => {
    const fetchOperatives = async () => {
      try {
        setLoadingOperatives(true)
        const res = await fetch("/api/operatives")
        if (!res.ok) return
        setOperatives(await res.json())
      } catch (e) {
        console.error("Failed to fetch operatives for calendar:", e)
      } finally {
        setLoadingOperatives(false)
      }
    }
    fetchOperatives()
  }, [])

  useEffect(() => {
    const loadExtra = async () => {
      try {
        const [cRes, aRes] = await Promise.all([fetch("/api/clients"), fetch("/api/assignments")])
        if (cRes.ok) setClients(await cRes.json())
        if (aRes.ok) setAssignments(await aRes.json())
      } catch (e) {
        console.error("Failed to fetch clients/assignments for calendar:", e)
      }
    }
    loadExtra()
  }, [])

  // ---- Calendar math ----
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  // Offset so weeks start on Monday (Mon=0,...,Sun=6)
  const firstDayOfWeek = ((firstDayOfMonth.getDay() + 6) % 7)
  const daysInMonth = lastDayOfMonth.getDate()

  const navigateMonth = (dir: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() + (dir === "prev" ? -1 : 1))
      return d
    })
  }

  const isDateInRange = (date: Date, start: Date, end: Date) => {
    // Compare date-only
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    return d >= s && d <= e
  }

  // Assigned count for a site on a specific date
  const assignedOnDate = (site: any, date: Date) => {
    const list = Array.isArray(site.operatives) ? site.operatives : []
    const d0 = new Date(date); d0.setHours(0, 0, 0, 0)
    return list
      .filter((so: any) => String(so?.status || "").toUpperCase() !== "OFFSITE")
      .filter((so: any) => {
        const s = new Date(so.startDate); s.setHours(0, 0, 0, 0)
        const e = new Date(so.endDate);   e.setHours(0, 0, 0, 0)
        return d0 >= s && d0 <= e
      }).length
  }

  // Base sites on date (no filter)
  const sitesOnDate = (date: Date) =>
    sites.filter((s) => isDateInRange(date, new Date(s.startDate), new Date(s.endDate)))

  // Filtered sites on date by current filter
  const sitesOnDateFiltered = (date: Date) => {
  const all = sitesOnDate(date)

  if (siteFilter === "all") return all

  if (siteFilter === "active") {
    // Only sites whose dates include *today* (now), regardless of the cell's date
    const todayActive = (s: ConstructionSite) =>
      isDateInRange(new Date(), new Date(s.startDate), new Date(s.endDate))

    // Intersect with the day cell (keeps calendar logic intact, so only today's cell will show them)
    return all.filter(todayActive)
  }

  // "unfulfilled": in-range that day AND assigned < maxOperatives (or max not set)
  return all.filter((s: any) => {
    const max = Number(s.maxOperatives) || 0
    if (max <= 0) return true
    const assigned = assignedOnDate(s, date)
    return assigned < max
  })
}


  const getFillBadge = (assignedCount: number, maxOperatives: number) => {
    if (!maxOperatives || maxOperatives <= 0)
      return { label: "not filled", className: "bg-red-100 text-red-800" }
    if (assignedCount >= maxOperatives)
      return { label: "filled", className: "bg-green-100 text-green-800" }
    if (assignedCount > 0)
      return { label: "partial", className: "bg-yellow-100 text-yellow-800" }
    return { label: "not filled", className: "bg-red-100 text-red-800" }
  }

  // ---- Top-level snapshot stats ----
  const now = new Date()
  const deployedNowCount = useMemo(() => {
    const ids = new Set(
      (assignments || [])
        .filter((a: any) => String(a?.status || "").toUpperCase() !== "OFFSITE")
        .filter(
          (a: any) =>
            String(a?.status || "").toUpperCase() === "DEPLOYED" ||
            (!a.status && isDateInRange(now, new Date(a.startDate), new Date(a.endDate))),
        )
        .map((a: any) => String(a.operativeId)),
    )
    return ids.size
  }, [assignments])

  const activeSitesCount = useMemo(
    () => sites.filter((s) => isDateInRange(now, new Date(s.startDate), new Date(s.endDate))).length,
    [sites],
  )

  const notFulfilledCount = useMemo(() => {
    let count = 0
    for (const s of sites as any) {
      if (!isDateInRange(now, new Date(s.startDate), new Date(s.endDate))) continue
      const max = Number(s.maxOperatives) || 0
      const activeAssigned = assignedOnDate(s, now)
      if (max > 0 && activeAssigned < max) count++
      if (max <= 0) count++ // consider no max set as not fulfilled
    }
    return count
  }, [sites])

  // ---- Financials (Mon–Sun of current week) ----
  const msDay = 24 * 60 * 60 * 1000
  const weekBounds = useMemo(() => {
    const d = new Date()
    const day = d.getDay()
    const offsetToMon = (day + 6) % 7
    const start = new Date(d)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - offsetToMon)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [])

  const smallFinancial = useMemo(() => {
    let profit = 0
    const clientsById = new Map<number, Client>()
    for (const c of clients as any) clientsById.set(c.id as any, c)
    for (const a of assignments as any) {
      const site: any = a.site
      if (!site) continue
      const aStart = new Date(a.startDate)
      const aEnd = new Date(a.endDate)
      const start = new Date(Math.max(aStart.getTime(), weekBounds.start.getTime()))
      const end = new Date(Math.min(aEnd.getTime(), weekBounds.end.getTime()))
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      if (end < start) continue
      const days = Math.floor((end.getTime() - start.getTime()) / msDay) + 1
      const client: any = clientsById.get(site.clientId)
      const jt = client?.jobTypes?.find((j: any) => j.name === site.projectType)
      const payRate = jt ? Number(jt.payRate) : 0
      const clientCost = jt ? Number(jt.clientCost) : 0
      profit += (clientCost - payRate) * days
    }
    return profit
  }, [assignments, clients, weekBounds.start, weekBounds.end])

  // ---- Week boxes on right panel ----
  const getWeekRange = (date: Date) => {
    // Monday-start week
    const day = date.getDay() // 0=Sun, 1=Mon, ...
    const offsetToMon = (day + 6) % 7
    const start = new Date(date)
    start.setDate(date.getDate() - offsetToMon)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  const { start: weekStart, end: weekEnd } = getWeekRange(currentDate)

  const siteOverlapsRange = (site: ConstructionSite, start: Date, end: Date) => {
    const s = new Date(site.startDate)
    const e = new Date(site.endDate)
    return e >= start && s <= end
  }
  const sitesThisWeek = sites.filter((s) => siteOverlapsRange(s, weekStart, weekEnd))

  const assignedIdsThisWeek = new Set<string>(
    sitesThisWeek.flatMap((s: any) =>
      (s.operatives || [])
        .filter((so: any) => {
          const soStart = new Date(so.startDate)
          const soEnd = new Date(so.endDate)
          return soEnd >= weekStart && soStart <= weekEnd
        })
        .map((so: any) => String(so.operativeId)),
    ),
  )
  const onSiteCount = assignedIdsThisWeek.size
  const availableOperativesCount = operatives.length
    ? operatives.filter((op) => !assignedIdsThisWeek.has(String(op.id))).length
    : 0

  // ---- Render helpers ----
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-3 w-3" />
      case "phone":
        return <Phone className="h-3 w-3" />
      case "in-person":
        return <MapPin className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const renderCalendarDays = () => {
    const cells: JSX.Element[] = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 border border-border/50" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const daySites = sitesOnDateFiltered(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()

      cells.push(
        <div
          key={day}
          className={`h-24 border border-border/50 p-1 cursor-pointer hover:bg-accent/50 transition-colors ${
            isToday ? "bg-primary/10 border-primary/30" : ""
          } ${isSelected ? "bg-accent border-accent-foreground" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary font-semibold" : ""}`}>{day}</div>
          <div className="space-y-1">
            {daySites.slice(0, 2).map((site) => {
              const assigned = assignedOnDate(site, date)
              const fill = getFillBadge(assigned, (site as any).maxOperatives)
              return (
                <div
                  key={`site-${site.id}`}
                  className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center justify-between gap-1 border ${fill.className}`}
                  title={`${site.name} (${assigned}/${(site as any).maxOperatives || 0})`}
                >
                  <span className="truncate">{site.name}</span>
                  <span className="shrink-0">
                    {assigned}/{(site as any).maxOperatives || 0}
                  </span>
                </div>
              )
            })}
            {daySites.length > 2 && <div className="text-xs text-muted-foreground">+{daySites.length - 2} more</div>}
          </div>
        </div>,
      )
    }

    return cells
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-balance">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter switch */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="inline-flex rounded-md border overflow-hidden">
            <Button
              variant={siteFilter === "all" ? "default" : "ghost"}
              size="sm"
              className={siteFilter === "all" ? "" : "bg-transparent"}
              onClick={() => setSiteFilter("all")}
            >
              All sites
            </Button>
            <Button
              variant={siteFilter === "unfulfilled" ? "default" : "ghost"}
              size="sm"
              className={siteFilter === "unfulfilled" ? "" : "bg-transparent"}
              onClick={() => setSiteFilter("unfulfilled")}
            >
              Unfulfilled
            </Button>
            <Button
              variant={siteFilter === "active" ? "default" : "ghost"}
              size="sm"
              className={siteFilter === "active" ? "" : "bg-transparent"}
              onClick={() => setSiteFilter("active")}
            >
              Active
            </Button>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <HardHat className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deployedNowCount}</p>
                <p className="text-sm text-muted-foreground">Operatives Deployed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSitesCount}</p>
                <p className="text-sm text-muted-foreground">Active Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notFulfilledCount}</p>
                <p className="text-sm text-muted-foreground">Not Fulfilled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <PoundSterling className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">£{smallFinancial.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Profit (This Week)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map((d) => (
                  <div key={d} className="p-3 text-center font-medium text-muted-foreground border-r border-border last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">{renderCalendarDays()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Right pane */}
        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sitesOnDateFiltered(selectedDate).map((site: any) => {
                  const assigned = assignedOnDate(site, selectedDate)
                  return (
                    <div key={site.id} className="p-3 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{site.name}</div>
                        <Badge variant="secondary">
                          {assigned}/{site.maxOperatives || 0}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{site.address}</span>
                      </div>
                      {assigned > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(site.operatives || [])
                            .filter((so: any) => String(so?.status || "").toUpperCase() !== "OFFSITE")
                            .filter((so: any) => {
                              const s = new Date(so.startDate)
                              const e = new Date(so.endDate)
                              return isDateInRange(selectedDate, s, e)
                            })
                            .slice(0, 6)
                            .map((so: any) => {
                              const displayName =
                                so?.operative?.personalDetails?.fullName ||
                                so?.operative?.id ||
                                `Operative ${so.operativeId}`
                              return (
                                <Badge key={so.id} variant="outline" className="text-[10px]">
                                  {displayName}
                                </Badge>
                              )
                            })}
                          {assigned > 6 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{assigned - 6} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No operatives assigned</p>
                      )}
                    </div>
                  )
                })}
                {sitesOnDateFiltered(selectedDate).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No sites match this filter</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Sites</span>
                <Badge variant="secondary">{sitesThisWeek.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Operatives</span>
                <Badge variant="outline">{availableOperativesCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">On Site</span>
                <Badge variant="default">{onSiteCount}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

