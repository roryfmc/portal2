"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HardHat, Building2, Users, Calendar, Clock, Phone, Mail, Plus } from "lucide-react"
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
  const activeSites = sites.filter((s) => String(s.status).toLowerCase() === "active").length
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
                    {operative.trade && (
                      <p className="text-sm text-muted-foreground">{operative.trade}</p>
                    )}
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
