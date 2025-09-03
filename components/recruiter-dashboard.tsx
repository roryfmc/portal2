"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Calendar, CheckCircle, Clock, TrendingUp, Plus, ArrowRight, Video, Phone, MapPin } from "lucide-react"
import { mockOperatives, mockManagers, mockSiteAssignments } from "@/lib/data"
import { getStoredAppointments, getStoredCandidates, getStoredRecruiters } from "@/lib/storage"
import type { Appointment, Operative, Manager } from "@/lib/types"

export function RecruiterDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [managers, setManagers] = useState<Manager[]>([])

  useEffect(() => {
    const storedAppointments = getStoredAppointments()
    const storedCandidates = getStoredCandidates()
    const storedRecruiters = getStoredRecruiters()

    setAppointments([...mockSiteAssignments, ...storedAppointments])
    setOperatives([...mockOperatives, ...storedCandidates])
    setManagers([...mockManagers, ...storedRecruiters])
  }, [])

  const metrics = useMemo(() => {
    const now = new Date()
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const thisWeekAppointments = appointments.filter((apt) => new Date(apt.startTime) >= thisWeek)
    const thisMonthOperatives = operatives.filter((operative) => operative.createdAt >= thisMonth)

    const upcomingAppointments = appointments.filter(
      (apt) => new Date(apt.startTime) > now && apt.status === "scheduled",
    )

    const completedAppointments = appointments.filter((apt) => apt.status === "completed")
    const totalScheduled = appointments.filter((apt) => apt.status === "scheduled").length

    const completionRate = totalScheduled > 0 ? (completedAppointments.length / totalScheduled) * 100 : 0

    const operativesByStatus = {
      available: operatives.filter((o) => o.status === "available").length,
      "on-site": operatives.filter((o) => o.status === "on-site").length,
      "off-duty": operatives.filter((o) => o.status === "off-duty").length,
      training: operatives.filter((o) => o.status === "training").length,
    }

    return {
      totalOperatives: operatives.length,
      newOperativesThisMonth: thisMonthOperatives.length,
      totalAssignments: appointments.length,
      thisWeekAssignments: thisWeekAppointments.length,
      upcomingAssignments: upcomingAppointments.length,
      completionRate,
      operativesByStatus,
    }
  }, [appointments, operatives])

  const upcomingInterviews = useMemo(() => {
    const now = new Date()
    return appointments
      .filter((apt) => new Date(apt.startTime) > now && apt.status === "scheduled")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5)
  }, [appointments])

  const recentActivity = useMemo(() => {
    const activities = [
      ...operatives.map((operative) => ({
        id: `operative-${operative.id}`,
        type: "operative" as const,
        message: `New operative ${operative.name} added for ${operative.position}`,
        timestamp: operative.createdAt,
        status: operative.status,
      })),
      ...appointments.map((apt) => ({
        id: `appointment-${apt.id}`,
        type: "appointment" as const,
        message: `Interview scheduled with ${operatives.find((o) => o.id === apt.candidateId)?.name || "Unknown"}`,
        timestamp: apt.createdAt,
        status: apt.status,
      })),
    ]

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8)
  }, [appointments, operatives])

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance mb-2">Workforce Dashboard</h1>
        <p className="text-muted-foreground text-pretty">
          Overview of construction workforce deployment and site assignments
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operatives</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOperatives}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />+{metrics.newOperativesThisMonth}
              </span>
              new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week's Assignments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.thisWeekAssignments}</div>
            <p className="text-xs text-muted-foreground">{metrics.upcomingAssignments} upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</div>
            <Progress value={metrics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers.length}</div>
            <p className="text-xs text-muted-foreground">
              across {new Set(managers.map((m) => m.department)).size} departments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operative Status Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Operative Status
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(metrics.operativesByStatus).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className="text-2xl font-bold text-primary">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{status.replace("-", " ")}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deployment Rate</span>
                <span>
                  {metrics.operativesByStatus["on-site"]} / {metrics.totalOperatives} deployed
                </span>
              </div>
              <Progress value={(metrics.operativesByStatus["on-site"] / Math.max(metrics.totalOperatives, 1)) * 100} />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add New Operative
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Assign to Site
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Add Site Manager
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingInterviews.length > 0 ? (
              upcomingInterviews.map((apt) => {
                const operative = operatives.find((o) => o.id === apt.candidateId)
                const manager = managers.find((m) => m.id === apt.recruiterId)

                return (
                  <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{operative ? getInitials(operative.name) : "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{operative?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{operative?.position}</p>
                        <p className="text-xs text-muted-foreground">with {manager?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        {getTypeIcon(apt.type)}
                        {apt.type}
                      </div>
                      <div className="text-xs">{new Date(apt.startTime).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(apt.startTime).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">No upcoming interviews scheduled</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50">
                  <div className="mt-1">
                    {activity.type === "operative" ? (
                      <Users className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Calendar className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {activity.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{activity.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
