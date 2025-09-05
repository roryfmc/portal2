"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Clock, Video, Phone, MapPin } from "lucide-react"
import type {ConstructionSite, Operative } from "@/lib/types"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [loadingOperatives, setLoadingOperatives] = useState(false)


  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true)
        const res = await fetch("/api/sites")
        if (res.ok) {
          const data = await res.json()
          // normalize dates
          setSites(
            data.map((s: any) => ({
              ...s,
              startDate: new Date(s.startDate),
              endDate: new Date(s.endDate),
              createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
            })),
          )
        }
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
        if (res.ok) {
          const data = await res.json()
          setOperatives(data)
        }
      } catch (e) {
        console.error("Failed to fetch operatives for calendar:", e)
      } finally {
        setLoadingOperatives(false)
      }
    }
    fetchOperatives()
  }, [])


  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }
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

  const isDateInRange = (date: Date, start: Date, end: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    return d >= s && d <= e
  }

  const getFillBadge = (assignedCount: number, maxOperatives: number) => {
    if (!maxOperatives || maxOperatives <= 0) return { label: "not filled", className: "bg-red-100 text-red-800" }
    if (assignedCount >= maxOperatives) return { label: "filled", className: "bg-green-100 text-green-800" }
    if (assignedCount > 0) return { label: "partial", className: "bg-yellow-100 text-yellow-800" }
    return { label: "not filled", className: "bg-red-100 text-red-800" }
  }

  const sitesOnDate = (date: Date) =>
    sites.filter((s) => isDateInRange(date, new Date(s.startDate), new Date(s.endDate)))

  const renderCalendarDays = () => {
    const days = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border/50" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const daySites = sitesOnDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()

      days.push(
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
              const assigned = Array.isArray(site.operatives) ? site.operatives.length : 0
              const fill = getFillBadge(assigned, site.maxOperatives)
              return (
                <div
                  key={`site-${site.id}`}
                  className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center justify-between gap-1 border ${fill.className}`}
                  title={`${site.name} (${assigned}/${site.maxOperatives})`}
                >
                  <span className="truncate">{site.name}</span>
                  <span className="shrink-0">
                    {assigned}/{site.maxOperatives}
                  </span>
                </div>
              )
            })}
            {daySites.length > 2 && (
              <div className="text-xs text-muted-foreground">+{daySites.length - 2} more</div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

  // Week metrics (Sunday-Saturday week containing currentDate)
  const getWeekRange = (date: Date) => {
    const day = date.getDay() // 0-6, 0=Sun
    const start = new Date(date)
    start.setDate(date.getDate() - day)
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
        .map((so: any) => String(so.operativeId))
    )
  )

  const onSiteCount = assignedIdsThisWeek.size
  const availableOperativesCount = operatives.length
    ? operatives.filter((op) => !assignedIdsThisWeek.has(String(op.id))).length
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <Button className="flex items-center gap-2" onClick={() => setShowBookingModal(true)}>
          <Plus className="h-4 w-4" />
          Assign Operative
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="p-3 text-center font-medium text-muted-foreground border-r border-border last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">{renderCalendarDays()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sitesOnDate(selectedDate).map((site) => {
                  const assigned = Array.isArray(site.operatives) ? site.operatives : []
                  return (
                    <div key={site.id} className="p-3 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{site.name}</div>
                        <Badge variant="secondary">
                          {assigned.length}/{site.maxOperatives}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{site.address}</span>
                      </div>
                      {assigned.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assigned.slice(0, 6).map((so: any) => (
                            <Badge key={so.id} variant="outline" className="text-[10px]">
                              {so.operative?.name ?? `Operative ${so.operativeId}`}
                            </Badge>
                          ))}
                          {assigned.length > 6 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{assigned.length - 6} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No operatives assigned</p>
                      )}
                    </div>
                  )
                })}

                {sitesOnDate(selectedDate).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No active sites on this date</p>
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
