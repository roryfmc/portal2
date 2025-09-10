"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, Building2, MapPin, Calendar, Users, CheckCircle, AlertTriangle } from "lucide-react"
import type { ConstructionSite, Operative, SiteAssignment, Client } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

type SiteActivityFilter = "all" | "active" | "inactive"

export function SiteManagement() {
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [assignments, setAssignments] = useState<SiteAssignment[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [siteActivityFilter, setSiteActivityFilter] = useState<SiteActivityFilter>("all")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null)

  const [operativeSearchTerm, setOperativeSearchTerm] = useState("")
  const [selectedOperatives, setSelectedOperatives] = useState<string[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "deployed">("all")
  const [complianceFilter, setComplianceFilter] = useState<"all" | "compliant" | "attention">("all")

  const [geoCache, setGeoCache] = useState<Record<string, { lat: number; lng: number }>>({})
  const [distanceMap, setDistanceMap] = useState<Record<string, number>>({})
  const OPENCAGE_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY as string | undefined

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    clientId: "",
    projectType: "",
    startDate: "",
    endDate: "",
    requiredTrades: "",
    maxOperatives: "",
  })
  // Determine current site client id (from form or editing context)
  const currentClientId = useMemo(() => {
    if (formData.clientId) {
      const n = Number(formData.clientId)
      return Number.isFinite(n) ? n : undefined
    }
    if (editingSite?.clientId != null) return Number(editingSite.clientId)
    return undefined
  }, [formData.clientId, editingSite])

  // Build an index for quick operative lookup
  const operativeById = useMemo(() => {
    const map: Record<string, Operative> = {}
    for (const op of operatives) map[op.id] = op
    return map
  }, [operatives])

  // Compute incompatibility reasons between a candidate operative and current selections / client
  const getIncompatibilityWarnings = (candidate: Operative) => {
    const warnings: string[] = []

    // Against client
    if (currentClientId != null && Array.isArray(candidate.unableToWorkWith)) {
      const clientBlocks = candidate.unableToWorkWith.filter(
        (u: any) => (u.targetType === "CLIENT" || u.targetType === "client") && Number(u.targetClientId) === Number(currentClientId),
      )
      for (const blk of clientBlocks) {
        const clientName = getClientName(String(currentClientId))
        const note = blk && typeof blk.note === "string" && blk.note.length ? " Note: " + blk.note : ""
        warnings.push((candidate.personalDetails?.fullName || candidate.id) + " is unable to work with client " + "." + note)
      }
    }

    // Against other selected operatives (both directions)
    for (const selectedId of selectedOperatives) {
      if (selectedId === candidate.id) continue
      const other = operativeById[selectedId]
      if (!other) continue

      // Candidate -> Other
      const candBlocks = (candidate.unableToWorkWith || []).filter(
        (u: any) => (u.targetType === "OPERATIVE" || u.targetType === "operative") && String(u.targetOperativeId) === String(other.id),
      )
      for (const blk of candBlocks) {
        const note = blk && typeof blk.note === "string" && blk.note.length ? " Note: " + blk.note : ""
        warnings.push((candidate.personalDetails?.fullName || candidate.id) + " is unable to work with " + (other.personalDetails?.fullName || other.id) + "." + note)
      }

      // Other -> Candidate
      const otherBlocks = (other.unableToWorkWith || []).filter(
        (u: any) => (u.targetType === "OPERATIVE" || u.targetType === "operative") && String(u.targetOperativeId) === String(candidate.id),
      )
      for (const blk of otherBlocks) {
        const note = blk && typeof blk.note === "string" && blk.note.length ? " Note: " + blk.note : ""
        warnings.push((other.personalDetails?.fullName || other.id) + " is unable to work with " + (candidate.personalDetails?.fullName || candidate.id) + "." + note)
      }
    }

    return warnings
  }


  /* ---------------- Fetch data ---------------- */
  useEffect(() => {
    fetchOperatives()
    fetchAssignments()
    fetchSites()
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err)
    }
  }

  const fetchOperatives = async () => {
    try {
      const response = await fetch("/api/operatives")
      if (response.ok) {
        const data = await response.json()
        setOperatives(data)
      }
    } catch (error) {
      console.error("Failed to fetch operatives:", error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments")
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      }
    } catch (err) {
      console.error("Failed to fetch assignments:", err)
    }
  }

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites")
      if (res.ok) {
        const data = await res.json()
        // normalize dates from API
        setSites(
          data.map((s: any) => ({
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          })),
        )
      }
    } catch (err) {
      console.error("Failed to fetch sites:", err)
    }
  }

  /* ---------------- Helpers ---------------- */
  const isDateInRange = (date: Date, start: Date, end: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    return d >= s && d <= e
  }

  // Week helpers (Monday–Sunday)
  const getCurrentWeekRange = () => {
    const today = new Date()
    const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const day = d0.getDay() // 0=Sun..6=Sat
    const diffToMonday = (day + 6) % 7 // 0 for Monday
    const start = new Date(d0)
    start.setDate(d0.getDate() - diffToMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start, end }
  }

  const isSiteActiveThisWeek = (site: ConstructionSite) => {
    const { start: weekStart, end: weekEnd } = getCurrentWeekRange()
    const s = new Date(site.startDate)
    const e = new Date(site.endDate)
    return s <= weekEnd && weekStart <= e
  }

  const getAssignedOperatives = (siteId: string) => {
    const siteAssignments = assignments.filter((assignment) => assignment.siteId === siteId)
    return siteAssignments
      .map((assignment) => operatives.find((operative) => operative.id === assignment.operativeId))
      .filter(Boolean) as Operative[]
  }

  const isOperativeDeployedThisWeek = (operativeId: string) => {
    const { start: weekStart, end: weekEnd } = getCurrentWeekRange()
    return assignments.some((a: any) => {
      const aStart = new Date(a.startDate)
      const aEnd = new Date(a.endDate)
      return String(a.operativeId) === String(operativeId) && aStart <= weekEnd && weekStart <= aEnd
    })
  }

  const isOperativeDeployedForCurrentRange = (operativeId: string) => {
    const start = formData.startDate ? new Date(formData.startDate) : editingSite?.startDate
    const end = formData.endDate ? new Date(formData.endDate) : editingSite?.endDate
    if (start && end) {
      return assignments.some((a: any) => {
        const aStart = new Date(a.startDate)
        const aEnd = new Date(a.endDate)
        return String(a.operativeId) === String(operativeId) && aStart <= end && start <= aEnd
      })
    }
    return isOperativeDeployedThisWeek(operativeId)
  }

  const getComplianceStatus = (operative: Operative) => {
    const list = operative.complianceCertificates ?? []
    if (list.length === 0) return "error" as const
    const hasRisk = list.some(
      (c: any) => c.status === "EXPIRING_SOON" || c.status === "EXPIRED" || c.status === "INVALID",
    )
    return (hasRisk ? "warning" : "success") as const
  }

  /* ---------------- Filtering ---------------- */
  const filteredSites = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return sites.filter((site) => {
      const textMatch =
        site.name.toLowerCase().includes(q) ||
        site.address.toLowerCase().includes(q) ||
        site.projectType.toLowerCase().includes(q)
      if (!textMatch) return false

      if (siteActivityFilter === "all") return true
      const active = isSiteActiveThisWeek(site)
      return siteActivityFilter === "active" ? active : !active
    })
  }, [sites, searchTerm, siteActivityFilter])

  const filteredOperatives = useMemo(() => {
    const q = operativeSearchTerm.toLowerCase()
    return operatives.filter((operative) => {
      const name = operative.personalDetails?.fullName?.toLowerCase() || ""
      const trade = (operative.trade || "").toLowerCase()
      const id = operative.id?.toLowerCase() || ""
      const matchesText = name.includes(q) || trade.includes(q) || id.includes(q)

      const isDep = isOperativeDeployedForCurrentRange(operative.id)
      const matchesAvail =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && !isDep) ||
        (availabilityFilter === "deployed" && isDep)

      const compliant = getComplianceStatus(operative) === "success"
      const matchesComp =
        complianceFilter === "all" ||
        (complianceFilter === "compliant" && compliant) ||
        (complianceFilter === "attention" && !compliant)

      return matchesText && matchesAvail && matchesComp
    })
  }, [operatives, operativeSearchTerm, availabilityFilter, complianceFilter, assignments, formData, editingSite])

  /* ---------------- Distance helpers ---------------- */
  const geocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    if (!address) return null
    if (geoCache[address]) return geoCache[address]
    try {
      if (!OPENCAGE_KEY) return null
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_KEY}`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      const g = data?.results?.[0]?.geometry
      if (g?.lat && g?.lng) {
        const coords = { lat: g.lat, lng: g.lng }
        setGeoCache((prev) => ({ ...prev, [address]: coords }))
        return coords
      }
    } catch (e) {
      console.error("Geocoding failed", e)
    }
    return null
  }

  const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (x: number) => (x * Math.PI) / 180
    const R = 6371
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
    return R * c
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const siteAddr = formData.address || editingSite?.address
      if (!siteAddr) return
      const sCoords = await geocode(siteAddr)
      if (!sCoords) return
      for (const op of filteredOperatives) {
        const addr = op.personalDetails?.address
        if (!addr) continue
        if (distanceMap[op.id]) continue
        const oCoords = await geocode(addr)
        if (!oCoords) continue
        const dist = haversine(sCoords, oCoords)
        if (!cancelled) setDistanceMap((prev) => ({ ...prev, [op.id]: dist }))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [filteredOperatives, formData.address, editingSite]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- Derived stats ---------------- */
  const totalSites = sites.length
  const fullyFulfilledCount = useMemo(() => {
    return sites.reduce((acc, site) => {
      const assigned = assignments.filter((a) => a.siteId === site.id).length
      return acc + (site.maxOperatives > 0 && assigned >= site.maxOperatives ? 1 : 0)
    }, 0)
  }, [sites, assignments])

  /* ---------------- Actions ---------------- */
  const handleOperativeAssignment = async () => {
    if (!editingSite) return
    try {
      const currentAssignments = assignments.filter((a) => a.siteId === editingSite.id)
      const currentOperativeIds = currentAssignments.map((a) => a.operativeId)

      const operativesToAdd = selectedOperatives.filter((id) => !currentOperativeIds.includes(id))
      const operativesToRemove = currentOperativeIds.filter((id) => !selectedOperatives.includes(id))

      for (const operativeId of operativesToAdd) {
        const assignmentData = {
          operativeId,
          siteId: editingSite.id,
          startDate: editingSite.startDate.toISOString().split("T")[0],
          endDate: editingSite.endDate.toISOString().split("T")[0],
          status: "scheduled" as const,
        }
        await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assignmentData),
        })
      }

      for (const operativeId of operativesToRemove) {
        const assignmentToRemove = currentAssignments.find((a) => a.operativeId === operativeId)
        if (assignmentToRemove) {
          await fetch(`/api/assignments?id=${assignmentToRemove.id}`, { method: "DELETE" })
        }
      }

      await fetchAssignments()
    } catch (error) {
      console.error("Failed to update operative assignments:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const siteData: ConstructionSite = {
      id: editingSite?.id || undefined,
      name: formData.name,
      address: formData.address,
      clientId: formData.clientId,
      projectType: formData.projectType,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: editingSite?.status || "planning",
      requiredTrades: formData.requiredTrades ? formData.requiredTrades.split(",").map((t) => t.trim()) : [],
      maxOperatives: Number(formData.maxOperatives),
      createdAt: editingSite?.createdAt || new Date(),
    }

    try {
      if (editingSite) {
        if (selectedOperatives.length > siteData.maxOperatives) {
          toast({
            title: "Selection exceeds maximum",
            description: `Selected ${selectedOperatives.length} but max is ${siteData.maxOperatives}. Please deselect some operatives.`,
          })
          return
        }
        await fetch(`/api/sites/${editingSite.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(siteData),
        })
        await handleOperativeAssignment()
      } else {
        await fetch("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(siteData),
        })
      }

      await fetchSites()
      resetForm()
    } catch (err) {
      console.error("Failed to save site:", err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      clientId: "",
      projectType: "",
      startDate: "",
      endDate: "",
      requiredTrades: "",
      maxOperatives: "",
    })
    setEditingSite(null)
    setIsAddDialogOpen(false)
    setSelectedOperatives([])
    setOperativeSearchTerm("")
  }

  const handleEdit = (site: ConstructionSite) => {
    setEditingSite(site)
    setFormData({
      name: site.name,
      address: site.address,
      clientId: site.clientId,
      projectType: site.projectType,
      startDate: site.startDate.toISOString().split("T")[0],
      endDate: site.endDate.toISOString().split("T")[0],
      requiredTrades: site.requiredTrades.join(", "),
      maxOperatives: String(site.maxOperatives ?? ""),
    })
    const assigned = getAssignedOperatives(site.id)
    setSelectedOperatives(assigned.map((op) => op.id))
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/sites/${id}`, { method: "DELETE" })
      await fetchSites()
    } catch (err) {
      console.error("Failed to delete site:", err)
    }
  }

  const getFillBadge = (assignedCount: number, maxOperatives: number) => {
    if (!maxOperatives || maxOperatives <= 0) return { label: "NOT FILLED", className: "bg-red-100 text-red-800" }
    if (assignedCount >= maxOperatives) return { label: "FILLED", className: "bg-green-100 text-green-800" }
    if (assignedCount > 0) return { label: "PARTIALLY FILLED", className: "bg-yellow-100 text-yellow-800" }
    return { label: "NOT FILLED", className: "bg-red-100 text-red-800" }
  }

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return client?.name || "Unknown Client"
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Management</h1>
          <p className="text-muted-foreground">Manage construction sites and project assignments</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSite ? "Edit Site" : "Add New Construction Site"}</DialogTitle>
              <DialogDescription>
                {editingSite
                  ? "Update site information and manage operative assignments"
                  : "Add a new construction site to your projects"}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Site Details</TabsTrigger>
                <TabsTrigger value="operatives">Assign Operatives</TabsTrigger>
              </TabsList>

              {/* DETAILS */}
              <TabsContent value="details" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Site Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client</Label>
                      <Select
                        value={formData.clientId}
                        onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectType">Job Type</Label>
                    <Select
                      value={formData.projectType}
                      onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                      disabled={!formData.clientId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={formData.clientId ? "Select job type" : "Select a client first"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(clients.find((c) => String(c.id) === String(formData.clientId))?.jobTypes || []).map(
                          (jt) => (
                            <SelectItem key={jt.id} value={jt.name}>
                              {jt.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requiredTrade">Trade</Label>
                    <Select
                      value={formData.requiredTrades}
                      onValueChange={(value) => setFormData({ ...formData, requiredTrades: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electrician">Electrician</SelectItem>
                        <SelectItem value="plumber">Plumber</SelectItem>
                        <SelectItem value="carpenter">Carpenter</SelectItem>
                        <SelectItem value="general-laborer">General Laborer</SelectItem>
                        <SelectItem value="bricklayer">Bricklayer</SelectItem>
                        <SelectItem value="roofer">Roofer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxOperatives">Maximum Operatives</Label>
                    <Input
                      id="maxOperatives"
                      type="number"
                      value={formData.maxOperatives}
                      onChange={(e) => setFormData({ ...formData, maxOperatives: e.target.value })}
                      required
                    />
                  </div>
                </form>
              </TabsContent>

              {/* OPERATIVES */}
              <TabsContent value="operatives" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label htmlFor="avail">Availability</Label>
                      <Select
                        value={availabilityFilter}
                        onValueChange={(v) => setAvailabilityFilter(v as any)}
                      >
                        <SelectTrigger id="avail">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="available">Available this week</SelectItem>
                          <SelectItem value="deployed">Deployed this week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="comp">Compliance</Label>
                      <Select
                        value={complianceFilter}
                        onValueChange={(v) => setComplianceFilter(v as any)}
                      >
                        <SelectTrigger id="comp">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="compliant">Compliant</SelectItem>
                          <SelectItem value="attention">Needs Attention</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search operatives by name or trade..."
                        value={operativeSearchTerm}
                        onChange={(e) => setOperativeSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredOperatives.map((operative) => (
                      <div key={operative.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedOperatives.includes(operative.id)}
                          disabled={
                            !selectedOperatives.includes(operative.id) &&
                            Number(formData.maxOperatives || (editingSite?.maxOperatives ?? 0)) > 0 &&
                            selectedOperatives.length >= Number(
                              formData.maxOperatives || (editingSite?.maxOperatives ?? 0),
                            )
                          }
                          onCheckedChange={(checked) => {
                            const max = Number(formData.maxOperatives || (editingSite?.maxOperatives ?? 0))
                            if (checked) {
                              if (max > 0 && selectedOperatives.length >= max) {
                                toast({
                                  title: "Maximum operatives reached",
                                  description: `You can assign up to ${max} operatives to this site.`,
                                })
                                return
                              }
                              if (isOperativeDeployedForCurrentRange(operative.id)) {
                                const displayName = operative.personalDetails?.fullName || operative.id
                                const ok = window.confirm(
                                  `${displayName} is already assigned during this timeframe. Assign to multiple sites?`,
                                )
                                if (!ok) return
                              }
                              // Check incompatibilities (client and operatives) and block with toast
                              const warnings = getIncompatibilityWarnings(operative)
                              if (warnings.length > 0) {
                                const proceed = () => {
                                  setSelectedOperatives((prev) =>
                                    prev.includes(operative.id) ? prev : [...prev, operative.id]
                                  )
                                  toast({
                                    title: "Override applied",
                                    description: "Operative assigned despite incompatibility.",
                                  })
                                }

                                const t = toast({
                                  description: (
                                    <div className="space-y-3">
                                      {/* Title row with triangle + text */}
                                      <div className="flex items-center gap-2 font-semibold text-foreground">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        <span>Operative Unable to Work</span>
                                      </div>

                                      {/* Main explanation */}
                                      <p className="text-sm text-foreground">
                                        This operative is unable to work with the client or someone already assigned to this site.
                                      </p>

                                      {warnings.length > 0 && (
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                          {warnings.map((w, i) => (
                                            <li key={i}>{w}</li>
                                          ))}
                                        </ul>
                                      )}
                                      {/* Footer with button bottom-right */}
                                      <div className="flex justify-end">
                                        <Button
                                          onClick={() => {
                                            proceed()
                                            try {
                                              toast.dismiss(t.id)
                                            } catch {}
                                          }}
                                          size="sm"
                                          className="rounded-lg"
                                        >
                                          Override &amp; Assign
                                        </Button>
                                      </div>
                                    </div>
                                  ),
                                })
                                return
                              }
                              setSelectedOperatives([...selectedOperatives, operative.id])
                            } else {
                              setSelectedOperatives(
                                selectedOperatives.filter((id) => id !== operative.id),
                              )
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{operative.personalDetails?.fullName ?? operative.id}</p>
                          <p className="text-sm text-muted-foreground">{operative.trade}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {distanceMap[operative.id] && (
                            <span className="text-xs text-muted-foreground">
                              {distanceMap[operative.id].toFixed(1)} km away
                            </span>
                          )}
                          <Badge
                            variant={
                              isOperativeDeployedForCurrentRange(operative.id) ? "destructive" : "default"
                            }
                          >
                            {isOperativeDeployedForCurrentRange(operative.id) ? "Deployed" : "Available"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredOperatives.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No operatives found matching your search
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>{editingSite ? "Update" : "Add"} Site</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSites}</p>
                <p className="text-sm text-muted-foreground">Total Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fullyFulfilledCount}</p>
                <p className="text-sm text-muted-foreground">Fully Fulfilled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: activity filter + search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <div className="inline-flex rounded-md border overflow-hidden">
            <Button
              variant={siteActivityFilter === "all" ? "default" : "ghost"}
              size="sm"
              className={siteActivityFilter === "all" ? "" : "bg-transparent"}
              onClick={() => setSiteActivityFilter("all")}
            >
              All
            </Button>
            <Button
              variant={siteActivityFilter === "active" ? "default" : "ghost"}
              size="sm"
              className={siteActivityFilter === "active" ? "" : "bg-transparent"}
              onClick={() => setSiteActivityFilter("active")}
            >
              Active (this week)
            </Button>
            <Button
              variant={siteActivityFilter === "inactive" ? "default" : "ghost"}
              size="sm"
              className={siteActivityFilter === "inactive" ? "" : "bg-transparent"}
              onClick={() => setSiteActivityFilter("inactive")}
            >
              Not active this week
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sites by name, address, or project type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Site cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => {
          const assignedOperatives = getAssignedOperatives(site.id)
          const fill = getFillBadge(assignedOperatives.length, site.maxOperatives)
          const activeThisWeek = isSiteActiveThisWeek(site)

          return (
            <Card key={site.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={fill.className}>{fill.label}</Badge>
                    <Badge variant={activeThisWeek ? "default" : "outline"}>
                      {activeThisWeek ? "Active this week" : "Not active this week"}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="font-medium text-primary">{site.projectType}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{site.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Client: {getClientName(site.clientId)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatDate(site.startDate)} - {formatDate(site.endDate)}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Max Operatives:</span> {site.maxOperatives}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Assigned Operatives:</p>
                    <span className="text-xs text-muted-foreground">
                      {assignedOperatives.length}/{site.maxOperatives}
                    </span>
                  </div>
                  {assignedOperatives.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {assignedOperatives.slice(0, 3).map((operative) => {
                        const name = operative.personalDetails?.fullName || operative.id
                        return (
                          <Badge key={operative.id} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        )
                      })}
                      {assignedOperatives.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{assignedOperatives.length - 3} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No operatives assigned</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Required Trades:</p>
                  <div className="flex flex-wrap gap-1">
                    {site.requiredTrades.map((trade, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {trade}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(site)} className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(site.id)}
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete site"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No construction sites found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Add your first construction site to get started"}
          </p>
        </div>
      )}
    </div>
  )
}







