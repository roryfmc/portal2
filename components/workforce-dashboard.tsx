"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { HardHat, Building2, Users, Calendar, TrendingUp, Clock, Phone, Mail, Plus } from "lucide-react"
import { mockOperatives, mockConstructionSites, mockSiteAssignments, mockClients } from "@/lib/data"

export function WorkforceDashboard() {
  // Calculate metrics
  const totalOperatives = mockOperatives.length
  const availableOperatives = mockOperatives.filter((op) => op.status === "available").length
  const deployedOperatives = mockOperatives.filter((op) => op.status === "deployed").length
  const totalSites = mockConstructionSites.length
  const activeSites = mockConstructionSites.filter((site) => site.status === "active").length
  const totalClients = mockClients.length

  // Calculate deployment rate
  const deploymentRate = totalOperatives > 0 ? (deployedOperatives / totalOperatives) * 100 : 0

  // Get recent assignments
  const recentAssignments = mockSiteAssignments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Get upcoming assignments (starting soon)
  const upcomingAssignments = mockSiteAssignments
    .filter((assignment) => {
      const startDate = new Date(assignment.startDate)
      const today = new Date()
      const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 0 && daysDiff <= 7 && assignment.status === "scheduled"
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const getOperativeName = (operativeId: string) => {
    const operative = mockOperatives.find((op) => op.id === operativeId)
    return operative?.name || "Unknown Operative"
  }

  const getSiteName = (siteId: string) => {
    const site = mockConstructionSites.find((s) => s.id === siteId)
    return site?.name || "Unknown Site"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
            <p className="text-xs text-muted-foreground">
              {availableOperatives} available, {deployedOperatives} deployed
            </p>
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
            <CardTitle className="text-sm font-medium">Deployment Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deploymentRate.toFixed(1)}%</div>
            <Progress value={deploymentRate} className="mt-2" />
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Assignments
            </CardTitle>
            <CardDescription>Assignments starting within the next 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{getOperativeName(assignment.operativeId)}</p>
                    <p className="text-sm text-muted-foreground">{getSiteName(assignment.siteId)}</p>
                    <p className="text-xs text-muted-foreground">
                      Starts: {new Date(assignment.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                    <p className="text-sm font-medium mt-1">£{assignment.dailyRate}/day</p>
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
                    <p className="text-xs text-muted-foreground">
                      {assignment.trade} • {new Date(assignment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
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
            {mockOperatives.map((operative) => (
              <div key={operative.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{operative.name}</p>
                  <p className="text-sm text-muted-foreground">{operative.trade}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{operative.email}</span>
                  </div>
                  {operative.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{operative.phone}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Badge
                    className={
                      operative.status === "available"
                        ? "bg-green-100 text-green-800"
                        : operative.status === "deployed"
                          ? "bg-blue-100 text-blue-800"
                          : operative.status === "on-leave"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                    }
                  >
                    {operative.status}
                  </Badge>
                  <p className="text-sm font-medium mt-1">£{operative.hourlyRate}/hr</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
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
