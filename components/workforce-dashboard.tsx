"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HardHat, Building2, Users, Calendar, Clock, Phone, Mail, Plus } from "lucide-react"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { Operative, ConstructionSite, Client } from "@/lib/types"

export function WorkforceDashboard() {
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

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
        if (sitesRes.ok) setSites(await sitesRes.json())
        if (clientsRes.ok) setClients(await clientsRes.json())
        if (assignsRes.ok) setAssignments(await assignsRes.json())
      } catch (e) {
        console.error("Failed to load dashboard data:", e)
      }
    }
    load()
  }, [])

  const totalOperatives = operatives.length
  const activeSites = useMemo(() => {
  const today = new Date();
  today.setHours(0,0,0,0);
  return sites.filter((s: any) => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return start <= today && today <= end;
  }).length;
  }, [sites]);

  const totalSites = sites.length
  const totalClients = clients.length

  const now = new Date()
  const withStatus = useMemo(() => {
    return (assignments || []).map((a: any) => {
      const start = new Date(a.startDate)
      const end = new Date(a.endDate)
      let status: "upcoming" | "active" | "completed" = "upcoming"
      if (end < now) status = "completed"
      else if (start <= now && end >= now) status = "active"
      return { ...a, startDate: start, endDate: end, derivedStatus: status }
    })
  }, [assignments])

  const upcomingAssignments = useMemo(() => {
    const end = new Date()
    end.setDate(end.getDate() + 7)
    return withStatus
      .filter((a) => a.startDate >= now && a.startDate <= end)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [withStatus])

  const recentAssignments = useMemo(() => {
    return [...withStatus].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()).slice(0, 5)
  }, [withStatus])

  const getOperativeName = (operativeId: string | number) => {
    const op = operatives.find((o) => String(o.id) === String(operativeId))
    return op?.personalDetails?.fullName || String(op?.id ?? "") || "Unknown Operative"
  }

  const getSiteName = (siteId: string | number) => {
    const s = sites.find((x: any) => String(x.id) === String(siteId))
    return s?.name || "Unknown Site"
  }

  const isOperativeDeployedNow = (operativeId: string | number) => {
    const nowTs = new Date()
    return (assignments || []).some((a: any) => {
      if (String(a.operativeId) !== String(operativeId)) return false
      const s = new Date(a.startDate)
      const e = new Date(a.endDate)
      return s <= nowTs && e >= nowTs
    })
  }

  const getDeploymentBadgeClass = (deployed: boolean) =>
    deployed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"

  // -------- Financials (current week Mon-Sun) --------
  const msDay = 24 * 60 * 60 * 1000
  const weekBounds = useMemo(() => {
    const d = new Date()
    const day = d.getDay() // 0 Sun..6 Sat
    const offsetToMon = (day + 6) % 7 // Mon=0, Sun=6
    const start = new Date(d)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - offsetToMon)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [])

  const financials = useMemo(() => {
    let revenue = 0
    let pay = 0
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

      revenue += clientCost * days
      pay += payRate * days
      profit += (clientCost - payRate) * days
    }
    return { revenue, pay, profit }
  }, [assignments, clients, weekBounds])

  const dailyFinancials = useMemo(() => {
    // Initialize days Mon..Sun within the current week
    const days: Array<{ label: string; date: Date; revenue: number; pay: number; profit: number }> = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekBounds.start)
      d.setDate(weekBounds.start.getDate() + i)
      d.setHours(0, 0, 0, 0)
      days.push({
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        date: d,
        revenue: 0,
        pay: 0,
        profit: 0,
      })
    }

    const clientsById = new Map<number, Client>()
    for (const c of clients as any) clientsById.set(c.id as any, c)

    for (const a of assignments as any) {
      const site: any = a.site
      if (!site) continue
      const aStart = new Date(a.startDate)
      const aEnd = new Date(a.endDate)
      const client: any = clientsById.get(site.clientId)
      const jt = client?.jobTypes?.find((j: any) => j.name === site.projectType)
      const payRate = jt ? Number(jt.payRate) : 0
      const clientCost = jt ? Number(jt.clientCost) : 0
      if (!payRate && !clientCost) continue

      for (let i = 0; i < 7; i++) {
        const d = days[i].date
        // Check if this day is covered by the assignment
        if (d >= new Date(aStart.getFullYear(), aStart.getMonth(), aStart.getDate()) &&
            d <= new Date(aEnd.getFullYear(), aEnd.getMonth(), aEnd.getDate())) {
          days[i].revenue += clientCost
          days[i].pay += payRate
          days[i].profit += (clientCost - payRate)
        }
      }
    }

    return days
  }, [assignments, clients, weekBounds])

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
    pay: { label: "Pay", color: "hsl(var(--chart-2))" },
    profit: { label: "Profit", color: "hsl(var(--chart-3))" },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workforce Dashboard</h1>
        <p className="text-muted-foreground">Overview of your construction workforce deployment</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operatives</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOperatives}</div>
            <p className="text-xs text-muted-foreground">Total workforce</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSites}</div>
            <p className="text-xs text-muted-foreground">{totalSites} total sites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">Active partnerships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Assignments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAssignments.length}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Stats (This Week) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Financial Stats (This Week)
          </CardTitle>
          <CardDescription>
            {weekBounds.start.toLocaleDateString()} - {weekBounds.end.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">£{financials.revenue.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Pay</p>
              <p className="text-2xl font-bold">£{financials.pay.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Profit</p>
              <p className="text-2xl font-bold">
                £{financials.profit.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Breakdown (Mon–Sun) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Daily Breakdown (This Week)
          </CardTitle>
          <CardDescription>
            Revenue, Pay and Profit by day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[560px] grid grid-cols-4 gap-2 text-sm">
              <div className="font-semibold">Day</div>
              <div className="font-semibold">Revenue</div>
              <div className="font-semibold">Pay</div>
              <div className="font-semibold">Profit</div>
              {dailyFinancials.map((d) => (
                <>
                  <div className="py-1">{d.label}</div>
                  <div className="py-1">£{d.revenue.toFixed(2)}</div>
                  <div className="py-1">£{d.pay.toFixed(2)}</div>
                  <div className="py-1">£{d.profit.toFixed(2)}</div>
                </>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Chart (This Week) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Financial Chart (This Week)
          </CardTitle>
          <CardDescription>Bar chart comparing Revenue, Pay and Profit</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="w-full">
            <BarChart data={dailyFinancials.map((d) => ({ day: d.label, revenue: d.revenue, pay: d.pay, profit: d.profit }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pay" fill="var(--color-pay)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="profit" fill="var(--color-profit)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Assignments
            </CardTitle>
            <CardDescription>Next 7 days of site assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{getOperativeName(assignment.operativeId)}</p>
                    <p className="text-sm text-muted-foreground">{getSiteName(assignment.siteId)}</p>
                    <p className="text-xs text-muted-foreground">
                      Starts {new Date(assignment.startDate).toLocaleDateString()} to {new Date(assignment.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const deployed = isOperativeDeployedNow(assignment.operativeId)
                      return (
                        <Badge className={getDeploymentBadgeClass(deployed)}>
                          {deployed ? "Deployed" : "Available"}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No upcoming assignments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest workforce assignments and updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAssignments.length > 0 ? (
              recentAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{getOperativeName(assignment.operativeId)}</p>
                    <p className="text-sm text-muted-foreground">{getSiteName(assignment.siteId)}</p>
                    <p className="text-xs text-muted-foreground">Start {new Date(assignment.startDate).toLocaleDateString()}</p>
                  </div>
                  {(() => {
                    const deployed = isOperativeDeployedNow(assignment.operativeId)
                    return (
                      <Badge className={getDeploymentBadgeClass(deployed)}>
                        {deployed ? "Deployed" : "Available"}
                      </Badge>
                    )
                  })()}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HardHat className="h-8 w-8 mx-auto mb-2" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operative Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Operative Status Overview
          </CardTitle>
          <CardDescription>Current status of all operatives in your workforce</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {operatives.map((operative) => {
              const deployed = isOperativeDeployedNow(operative.id)
              const pd = operative.personalDetails
              return (
                <div key={operative.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{pd?.fullName ?? "Unnamed operative"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{pd?.email ?? ""}</span>
                    </div>
                    {pd?.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{pd.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge className={getDeploymentBadgeClass(deployed)}>
                      {deployed ? "Deployed" : "Available"}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions (optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common workforce management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Operative
            </Button>
            <Button variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              New Site
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Assignment
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
