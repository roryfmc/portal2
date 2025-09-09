"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Users, AlertTriangle, CheckCircle, HardHat, UserCheck, ShieldAlert, Shield } from "lucide-react"
import type { Operative } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface OperativeListProps {
  onSelectOperative: (operative: Operative | null) => void
  onAddOperative: () => void
}

export function OperativeList({ onSelectOperative, onAddOperative }: OperativeListProps) {
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "deployed">("all")
  const [complianceFilter, setComplianceFilter] = useState<"all" | "compliant" | "attention">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [opsRes, assignsRes] = await Promise.all([
          fetch("/api/operatives", { cache: "no-store" }),
          fetch("/api/assignments", { cache: "no-store" }),
        ])
        if (!opsRes.ok) throw new Error(`HTTP ${opsRes.status}`)
        const ops = (await opsRes.json()) as Operative[]
        const assigns = assignsRes.ok ? await assignsRes.json() : []
        if (!ignore) {
          setOperatives(ops)
          setAssignments(assigns)
        }
      } catch (e) {
        console.error(e)
        if (!ignore) setError("Failed to load operatives")
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()

    // Optional: refresh if another tab updates storage (e.g., after creation)
    const onStorage = () => load()
    window.addEventListener("storage", onStorage)
    return () => {
      ignore = true
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // Date-only comparison to avoid time-of-day off-by-one issues
  function isDateInRange(date: Date, start: Date, end: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    return d >= s && d <= e
  }

  // Compliance status helper (hoisted via function declaration)
  function getComplianceStatus(operative: Operative) {
    const list = operative.complianceCertificates ?? []
    if (list.length === 0) return "error" as const

    // Required asbestos certificate types
    const REQUIRED = [
      "Training",
      "Medical",
      "Full Face Fit",
      "Half Face Fit",
      "Mask Service",
    ]

    const msDay = 24 * 60 * 60 * 1000
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const hasAllAsbestos = REQUIRED.every((req) => {
      // find matching asbestos cert by name
      const cert = list.find((c: any) => {
        const name = (c?.name || "").toString().trim()
        const typeOk = (c as any)?.certType ? (c as any).certType === "ASBESTOS" : true
        return typeOk && name.toLowerCase() === req.toLowerCase()
      })
      if (!cert) return false
      // compute days until expiry
      const exp = cert.expiryDate ? new Date(cert.expiryDate) : null
      if (!exp || isNaN(exp.getTime())) return false
      exp.setHours(0, 0, 0, 0)
      const daysLeft = Math.floor((exp.getTime() - now.getTime()) / msDay)
      // must be strictly greater than 42 days (6 weeks)
      if (daysLeft <= 42) return false
      // also if a status is present and indicates risk, treat as non-compliant
      if ((cert as any).status === "EXPIRED" || (cert as any).status === "EXPIRING_SOON" || (cert as any).status === "INVALID") return false
      return true
    })

    return (hasAllAsbestos ? "success" : "warning") as const
  }

  // Build a set of operativeIds currently deployed
  const deployedIds = useMemo(() => {
    const now = new Date()
    return new Set(
      (assignments || [])
        .filter((a: any) => isDateInRange(now, new Date(a.startDate), new Date(a.endDate)))
        .map((a: any) => String(a.operativeId)),
    )
  }, [assignments])

  const filteredOperatives = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return operatives.filter((op) => {
      const pd = op.personalDetails
      const matchesText = (
        (pd?.fullName?.toLowerCase() ?? "").includes(q) ||
        (pd?.email?.toLowerCase() ?? "").includes(q) ||
        (pd?.payrollNumber?.toLowerCase() ?? "").includes(q)
      )
      // availability filter
      const isDeployed = deployedIds.has(String(op.id))
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && !isDeployed) ||
        (availabilityFilter === "deployed" && isDeployed)

      // compliance filter
      const compliant = getComplianceStatus(op) === "success"
      const matchesCompliance =
        complianceFilter === "all" ||
        (complianceFilter === "compliant" && compliant) ||
        (complianceFilter === "attention" && !compliant)

      return matchesText && matchesAvailability && matchesCompliance
    })
  }, [operatives, searchTerm, availabilityFilter, complianceFilter, deployedIds])

  // Derived deployment counts
  const deployedCount = useMemo(() => {
    const now = new Date()
    const ids = new Set(
      (assignments || [])
        .filter((a: any) => isDateInRange(now, new Date(a.startDate), new Date(a.endDate)))
        .map((a: any) => String(a.operativeId)),
    )
    return operatives.filter((op) => ids.has(String(op.id))).length
  }, [assignments, operatives])

  const availableCount = useMemo(() => operatives.length - deployedCount, [operatives.length, deployedCount])

  const getInitials = (name?: string) =>
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading operatives...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
  {/* Left side: heading + text */}
        <div>
          <h1 className="text-2xl font-bold">Operative Management</h1>
          <p className="text-muted-foreground">Manage your operatives and compliance</p>
        </div>

        {/* Right side: buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={onAddOperative} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Operative
          </Button>
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("showCompliance"))}
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Expiring Compliance
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operatives.length}</p>
                <p className="text-sm text-muted-foreground">Total Operatives</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {operatives.filter((op) => getComplianceStatus(op) === "success").length}
                </p>
                <p className="text-sm text-muted-foreground">Compliant</p>
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
                <p className="text-2xl font-bold">
                  {operatives.filter((op) => getComplianceStatus(op) !== "success").length}
                </p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <HardHat className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deployedCount}</p>
                <p className="text-sm text-muted-foreground">Deployed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableCount}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="availability">Availability</Label>
          <Select value={availabilityFilter} onValueChange={(v) => setAvailabilityFilter(v as any)}>
            <SelectTrigger id="availability">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="deployed">Deployed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="compliance">Compliance</Label>
          <Select value={complianceFilter} onValueChange={(v) => setComplianceFilter(v as any)}>
            <SelectTrigger id="compliance">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="attention">Needs Attention</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search operatives by name, email, or payroll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Legacy search row removed in favor of combined filters */}
      {/* <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search operatives by name, email, or payroll number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div> */}

      {/* Operatives List */}
      <div className="space-y-4">
        {filteredOperatives.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {operatives.length === 0 ? "No operatives yet" : "No operatives found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {operatives.length === 0
                  ? "Get started by adding your first operative to the system."
                  : "Try adjusting your search terms."}
              </p>
              {operatives.length === 0 && (
                <Button onClick={onAddOperative}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Operative
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredOperatives.map((operative) => (
            <Card
              key={operative.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectOperative(operative)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(operative.personalDetails?.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate">
                        {operative.personalDetails?.fullName ?? "Unnamed operative"}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {operative.personalDetails?.payrollNumber ?? "—"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>{operative.personalDetails?.email ?? "—"}</span>
                      <span>{operative.personalDetails?.phone ?? "—"}</span>
                      <span className="capitalize">
                        {operative.personalDetails?.employmentType
                          ? operative.personalDetails.employmentType.toLowerCase()
                          : "—"}
                      </span>
                    </div>
                  </div>

                    {(() => {
                      const REQUIRED = ["Training", "Medical", "Full Face Fit", "Half Face Fit", "Mask Service"]
                      const list: any[] = (operative.complianceCertificates as any) || []
                      const msDay = 24 * 60 * 60 * 1000
                      const now = new Date(); now.setHours(0,0,0,0)
                      const findCert = (t: string) => list.find((c: any) => (c?.certType ? c.certType === "ASBESTOS" : true) && String(c.name || "").toLowerCase() === t.toLowerCase())
                      const missing = REQUIRED.filter((t) => !findCert(t))
                      const expiring = REQUIRED.map((t) => {
                        const c = findCert(t)
                        if (!c || !c.expiryDate) return null
                        const exp = new Date(c.expiryDate); exp.setHours(0,0,0,0)
                        const days = Math.floor((exp.getTime() - now.getTime())/msDay)
                        return { t, days }
                      }).filter((x: any) => x && (x.days <= 42)) as {t:string;days:number}[]
                      if (missing.length === 0 && expiring.length === 0) return null
                      return (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {missing.map((m) => (
                            <Badge key={`miss-${m}`} variant="destructive" className="text-[10px]">Missing: {m}</Badge>
                          ))}
                          {expiring.map((e) => (
                            <Badge key={`exp-${e.t}`} variant="secondary" className={`text-[10px] ${e.days <= 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-700'}`}>
                              {e.days <= 0 ? 'Expired' : 'Expiring'}: {e.t}{e.days > 0 ? ` (${e.days}d)` : ''}
                            </Badge>
                          ))}
                        </div>
                      )
                    })()}

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {operative.complianceCertificates?.length ?? 0} Certificates
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {operative.workSites?.length ?? 0} Sites Worked
                      </p>
                    </div>

                    <div className="flex items-center">
                      {getComplianceStatus(operative) === "success" && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {getComplianceStatus(operative) === "warning" && (
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      )}
                      {getComplianceStatus(operative) === "error" && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
