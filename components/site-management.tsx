"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  UserPlus,
  UserMinus,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import type { ConstructionSite, Operative, SiteAssignment, Client } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"
import { Navigation } from "@/components/navigation"

// ---- Types ----

type SiteActivityFilter = "all" | "active" | "inactive"

// ---- Component ----

export function SiteManagement() {
  // data
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [assignments, setAssignments] = useState<SiteAssignment[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // ui state
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [siteActivityFilter, setSiteActivityFilter] = useState<SiteActivityFilter>("all")
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null)
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)

  // operative filter state
  const [operativeSearchTerm, setOperativeSearchTerm] = useState("")
  const [selectedOperatives, setSelectedOperatives] = useState<string[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "deployed">("all")
  const [complianceFilter, setComplianceFilter] = useState<"all" | "compliant" | "attention">("all")

  // geo + distance (kept from original, not surfaced in UI change)
  const [geoCache, setGeoCache] = useState<Record<string, { lat: number; lng: number }>>({})
  const [distanceMap, setDistanceMap] = useState<Record<string, number>>({})
  const OPENCAGE_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY as string | undefined

  // form
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

  // ---- Derived ----
  const currentClientId = useMemo(() => {
    if (formData.clientId) {
      const n = Number(formData.clientId)
      return Number.isFinite(n) ? n : undefined
    }
    if (editingSite?.clientId != null) return Number(editingSite.clientId)
    return undefined
  }, [formData.clientId, editingSite])

  const operativeById = useMemo(() => {
    const map: Record<string, Operative> = {}
    for (const op of operatives) map[op.id] = op
    return map
  }, [operatives])

  // ---- Incompatibility checks (kept) ----
  const getClientName = (clientId: string | number) => {
    const c = clients.find((cl) => Number(cl.id) === Number(clientId))
    return c?.name || `Client #${clientId}`
  }

  const getIncompatibilityWarnings = (candidate: Operative) => {
    const warnings: string[] = []

    if (currentClientId != null && Array.isArray(candidate.unableToWorkWith)) {
      const clientBlocks = candidate.unableToWorkWith.filter(
        (u: any) => (u.targetType === "CLIENT" || u.targetType === "client") && Number(u.targetClientId) === Number(currentClientId),
      )
      for (const blk of clientBlocks) {
        const clientName = getClientName(currentClientId)
        const note = blk && typeof blk.note === "string" && blk.note.length ? ` Note: ${blk.note}` : ""
        warnings.push(`${candidate.personalDetails?.fullName || candidate.id} is unable to work with client ${clientName}.${note}`)
      }
    }

    for (const selectedId of selectedOperatives) {
      if (selectedId === candidate.id) continue
      const other = operativeById[selectedId]
      if (!other) continue

      const candBlocks = (candidate.unableToWorkWith || []).filter(
        (u: any) => (u.targetType === "OPERATIVE" || u.targetType === "operative") && String(u.targetOperativeId) === String(other.id),
      )
      for (const blk of candBlocks) {
        const note = blk && typeof blk.note === "string" && blk.note.length ? ` Note: ${blk.note}` : ""
        warnings.push(`${candidate.personalDetails?.fullName || candidate.id} is unable to work with ${other.personalDetails?.fullName || other.id}.${note}`)
      }

      const otherBlocks = (other.unableToWorkWith || []).filter(
        (u: any) => (u.targetType === "OPERATIVE" || u.targetType === "operative") && String(u.targetOperativeId) === String(candidate.id),
      )
      for (const blk of otherBlocks) {
        const note = blk && typeof blk.note === "string" && blk.note.length ? ` Note: ${blk.note}` : ""
        warnings.push(`${other.personalDetails?.fullName || other.id} is unable to work with ${candidate.personalDetails?.fullName || candidate.id}.${note}`)
      }
    }

    return warnings
  }

  // ---- Fetching (kept) ----
  useEffect(() => {
    fetchOperatives()
    fetchAssignments()
    fetchSites()
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      if (res.ok) setClients(await res.json())
    } catch (err) {
      console.error("Failed to fetch clients:", err)
    }
  }

  const fetchOperatives = async () => {
    try {
      const res = await fetch("/api/operatives")
      if (res.ok) setOperatives(await res.json())
    } catch (err) {
      console.error("Failed to fetch operatives:", err)
    }
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments")
      if (res.ok) setAssignments(await res.json())
    } catch (err) {
      console.error("Failed to fetch assignments:", err)
    }
  }

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites")
      if (res.ok) {
        const data = await res.json()
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

  // ---- Helpers (kept) ----
  const getCurrentWeekRange = () => {
    const today = new Date()
    const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const day = d0.getDay()
    const diffToMonday = (day + 6) % 7
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
    const siteAssignments = assignments.filter((a) => a.siteId === siteId)
    return siteAssignments
      .map((a) => operatives.find((o) => o.id === a.operativeId))
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

  // ---- Filtering (kept) ----
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

  // ---- Distance helpers (kept) ----
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
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
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
  }, [filteredOperatives, formData.address, editingSite])

  // ---- Stats ----
  const totalSites = sites.length
  const fullyFulfilledCount = useMemo(() => {
    return sites.reduce((acc, site) => {
      const assigned = assignments.filter((a) => a.siteId === site.id).length
      return acc + (site.maxOperatives > 0 && assigned >= site.maxOperatives ? 1 : 0)
    }, 0)
  }, [sites, assignments])

  // ---- Actions (kept) ----
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
          status: "SCHEDULED" as const,
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
      setShowForm(false)
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
    setShowForm(true)
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

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })


  // Return operatives NOT already assigned to this site AND not already selected in the modal
    const getUnassignedOperatives = (siteId: string) => {
    const assignedIds = new Set(getAssignedOperatives(siteId).map((o) => o.id))
    const selectedIds = new Set(selectedOperatives)
    // Use filteredOperatives to respect search/filters if you later add them above the modal
    return filteredOperatives.filter((op) => !assignedIds.has(op.id) && !selectedIds.has(op.id))
    }

// Add to current selection with your guards (max, overlap, incompatibilities)
    const assignOperativeToSite = (siteId: string, operativeId: string) => {
    const op = operatives.find((o) => o.id === operativeId)
    if (!op) return

    // Max cap
    const max = Number(formData.maxOperatives || (editingSite?.maxOperatives ?? 0))
    if (max > 0 && selectedOperatives.length >= max) {
        toast({
        title: "Maximum operatives reached",
        description: `You can assign up to ${max} operatives to this site.`,
        })
        return
    }

    // Overlap warning
    if (isOperativeDeployedForCurrentRange(operativeId)) {
        const name = op.personalDetails?.fullName || operativeId
        const ok = window.confirm(`${name} is already assigned during this timeframe. Assign to multiple sites?`)
        if (!ok) return
    }

    // Incompatibility warnings (+ override)
    const warnings = getIncompatibilityWarnings(op)
    if (warnings.length > 0) {
        const proceed = () => {
        setSelectedOperatives((prev) => (prev.includes(operativeId) ? prev : [...prev, operativeId]))
        toast({ title: "Override applied", description: "Operative assigned despite incompatibility." })
        }
        const t = toast({
        description: (
            <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span>Operative Unable to Work</span>
            </div>
            <p className="text-sm">
                This operative is unable to work with the client or someone already assigned to this site.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {warnings.map((w, i) => (
                <li key={i}>{w}</li>
                ))}
            </ul>
            <div className="flex justify-end">
                <Button
                size="sm"
                onClick={() => {
                    proceed()
                    try {
                    // @ts-ignore – shadcn toast typings
                    toast.dismiss(t.id)
                    } catch {}
                }}
                >
                Override &amp; Assign
                </Button>
            </div>
            </div>
        ),
        })
        return
    }

  // Normal add
    setSelectedOperatives((prev) => (prev.includes(operativeId) ? prev : [...prev, operativeId]))
    }

  // ---- UI ----
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Site Management</h1>
            <p className="text-slate-600 mt-2">Manage construction sites and project assignments</p>
          </div>
          <Button onClick={() => { if (showForm) { setShowForm(false); resetForm() } else { setShowForm(true) } }} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            {editingSite ? "Edit Site" : showForm ? "Close" : "Add Site"}
          </Button>
        </div>
        
        {/* Stats */}
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
        <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Assignment Modal */}
        {showAssignModal && (
            <Card className="mb-8">
                <CardHeader>
                <CardTitle>Assign Operatives</CardTitle>
                <CardDescription>Select operatives to assign to this construction site</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-3">Available Operatives</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                        {getUnassignedOperatives(showAssignModal).map((operative) => (
                            <div key={operative.id} className="flex items-center space-x-3 p-2 border rounded">
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                const siteId = showAssignModal!
                                const op = operative
                                // --- capacity check against current assigned count ---
                                const max = Number(formData.maxOperatives || (editingSite?.maxOperatives ?? 0))
                                const currentCount = getAssignedOperatives(siteId).length
                                if (max > 0 && currentCount >= max) {
                                    toast({
                                    title: "Maximum operatives reached",
                                    description: `You can assign up to ${max} operatives to this site.`,
                                    })
                                    return
                                }
                                // --- overlap confirm (uses your helper) ---
                                if (isOperativeDeployedForCurrentRange(op.id)) {
                                    const name = op.personalDetails?.fullName || op.id
                                    const ok = window.confirm(`${name} is already assigned during this timeframe. Assign to multiple sites?`)
                                    if (!ok) return
                                }
                                // helper to actually persist and refresh
                                const persist = async () => {
                                    // prefer editingSite dates; fallback to site by id
                                    const siteCtx = editingSite?.id === siteId
                                      ? editingSite
                                      : sites.find((s) => String(s.id) === String(siteId))

                                    // Ensure newly added operatives appear under "Assigned" (future schedule)
                                    const today = new Date(); today.setHours(0,0,0,0)
                                    let start = siteCtx?.startDate ? new Date(siteCtx.startDate) : new Date(today)
                                    start.setHours(0,0,0,0)
                                    if (start <= today) {
                                      start = new Date(today)
                                      start.setDate(today.getDate() + 1)
                                      start.setHours(0,0,0,0)
                                    }
                                    let end = siteCtx?.endDate ? new Date(siteCtx.endDate) : new Date(start)
                                    end.setHours(0,0,0,0)
                                    if (end < start) {
                                      end = new Date(start)
                                    }

                                    const startDateISO = start.toISOString().split("T")[0]
                                    const endDateISO = end.toISOString().split("T")[0]

                                    const res = await fetch("/api/assignments", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        operativeId: op.id,
                                        siteId,
                                        startDate: startDateISO,
                                        endDate: endDateISO,
                                      }),
                                    })
                                    if (!res.ok) {
                                    toast({ title: "Could not assign", description: "Server rejected the assignment." })
                                    return
                                    }
                                    setSelectedOperatives((prev) =>
                                    prev.includes(op.id) ? prev : [...prev, op.id]
                                    )
                                    await fetchAssignments()
                                    toast({ title: "Operative assigned", description: "Assignment saved." })
                                }
                                const warnings = getIncompatibilityWarnings(op)
                                if (warnings.length > 0) {
                                    const t = toast({
                                    description: (
                                        <div className="space-y-3">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                                            <span>Operative Unable to Work</span>
                                        </div>
                                        <p className="text-sm">
                                            This operative is unable to work with the client or someone already assigned to this site.
                                        </p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            {warnings.map((w, i) => (
                                            <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                        <div className="flex justify-end">
                                            <Button
                                            size="sm" onClick={async () => {await persist()
                                                try {
                                                toast.dismiss(t.id)
                                                } catch {}
                                            }}
                                            >
                                            Override &amp; Assign
                                            </Button>
                                        </div>
                                        </div>
                                    ),
                                    })
                                    return
                                }
                                // no warnings — persist directly
                                await persist()
                                }}
                            >
                                <UserPlus className="w-4 h-4" />
                            </Button>
                            <div>
            <p className="font-medium">
              {operative.personalDetails?.fullName ?? operative.id}
            </p>
            <p className="text-sm text-slate-600">{operative.trade}</p>
          </div>
        </div>
      ))}

      {getUnassignedOperatives(showAssignModal).length === 0 && (
        <p className="text-slate-600">All operatives are already assigned to this site</p>
      )}
    </div>
  </div>

  <Button
    variant="outline"
    onClick={() => {
      // no bulk save needed anymore; each add already persisted
      setShowAssignModal(null)
    }}
  >
    Done
  </Button>
</div>
                </CardContent>
            </Card>
        )}
        {/* Inline Add/Edit Form (UI from uichange) */}
        {showForm && (
          <Card className="mb-2">
            <CardHeader>
              <CardTitle>{editingSite ? "Edit Construction Site" : "Add New Construction Site"}</CardTitle>
              <CardDescription>{editingSite ? "Update site and assignments" : "Create a new site and assign a client"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Site Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client</Label>
                    <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
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
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectType">Job Type</Label>
                    <Select value={formData.projectType} onValueChange={(value) => setFormData({ ...formData, projectType: value })} disabled={!formData.clientId}>
                      <SelectTrigger>
                        <SelectValue placeholder={formData.clientId ? "Select job type" : "Select a client first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(clients.find((c) => String(c.id) === String(formData.clientId))?.jobTypes || []).map((jt) => (
                          <SelectItem key={jt.id} value={jt.name}>
                            {jt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requiredTrade">Trade</Label>
                    <Select value={formData.requiredTrades} onValueChange={(value) => setFormData({ ...formData, requiredTrades: value })}>
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxOperatives">Maximum Operatives</Label>
                    <Input id="maxOperatives" type="number" value={formData.maxOperatives} onChange={(e) => setFormData({ ...formData, maxOperatives: e.target.value })} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700">{editingSite ? "Update" : "Create"} Site</Button>
                  <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false) }}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <div className="inline-flex rounded-md border overflow-hidden bg-white">
              <Button variant={siteActivityFilter === "all" ? "default" : "ghost"} size="sm" onClick={() => setSiteActivityFilter("all")}>
                All
              </Button>
              <Button variant={siteActivityFilter === "active" ? "default" : "ghost"} size="sm" onClick={() => setSiteActivityFilter("active")}>
                Active (this week)
              </Button>
              <Button variant={siteActivityFilter === "inactive" ? "default" : "ghost"} size="sm" onClick={() => setSiteActivityFilter("inactive")}>
                Not active this week
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sites by name, address, or project type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
          </div>
        </div>

        {/* Sites List (styled like uichange) */}
        <div className="grid gap-6">
          {filteredSites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No construction sites found</h3>
                <p className="text-slate-600 text-center mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Add your first construction site to get started"}
                </p>
                <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Site
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredSites.map((site) => {
              const assignedOperatives = getAssignedOperatives(site.id)
              const fill = getFillBadge(assignedOperatives.length, site.maxOperatives)
              const activeThisWeek = isSiteActiveThisWeek(site)

              return (
                <Card key={site.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{site.name}</CardTitle>
                        <CardDescription className="text-base">Client: {getClientName(site.clientId)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={fill.className}>{fill.label}</Badge>
                        <Badge variant={activeThisWeek ? "default" : "outline"}>
                          {activeThisWeek ? "Active this week" : "Not active this week"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(site)}>
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(site.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{site.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(site.startDate)} - {formatDate(site.endDate)}
                          </span>
                        </div>
                        <p>
                          <span className="font-medium">Max Operatives:</span> {site.maxOperatives}
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Required Trades:</p>
                          <div className="flex flex-wrap gap-1">
                            {site.requiredTrades.map((trade, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {trade}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-600" />
                          <h4 className="font-semibold text-slate-900">Operative Management</h4>
                        </div>

                        <Tabs defaultValue="assigned" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="assigned">Assigned ({assignedOperatives.length})</TabsTrigger>
                            <TabsTrigger value="current">This Week ({assignedOperatives.filter((o) =>assignments.some((a) =>String(a.siteId) === String(site.id) &&
                            String(a.operativeId) === String(o.id) &&
                            String(a.status).toUpperCase() === "DEPLOYED"
                                  )
                                 ).length
                                })
                            </TabsTrigger>
                            <TabsTrigger value="off-site">Off Site</TabsTrigger>
                          </TabsList>
                        {/* ASSIGNED OPERATIVES TAB */}         
                          {/* ASSIGNED OPERATIVES TAB */}
                          <TabsContent value="assigned" className="space-y-2">
                            {(() => {
                                // ACTIVE ids for this site
                                const activeIds = new Set(
                                assignments
                                    .filter(
                                    (a) =>
                                        String(a.siteId) === String(site.id) &&
                                        String(a.status).toUpperCase() === "ASSIGNED"
                                    )
                                    .map((a) => String(a.operativeId))
                                )
                                // Only non-ACTIVE (future) operatives
                                const futureOps = assignedOperatives.filter(
                                (o) => !activeIds.has(String(o.id))
                                )

                                return (
                                <>
                                    <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-600">Operatives assigned for future work</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                        setEditingSite(site)
                                        const assigned = getAssignedOperatives(site.id)
                                        setSelectedOperatives(assigned.map((op) => op.id))
                                        setShowAssignModal(site.id)
                                        }}
                                        className="text-orange-600 hover:text-orange-700"
                                    >
                                        <UserPlus className="w-4 h-4 mr-1" />
                                        Add
                                    </Button>
                                    </div>

                                    {futureOps.length > 0 ? (
                                    futureOps.map((operative) => (
                                        <div
                                        key={operative.id}
                                        className="flex items-center justify-between bg-blue-50 p-3 rounded border-l-4 border-blue-400"
                                        >
                                        <div>
                                            <p className="font-medium text-sm">
                                            {operative.personalDetails?.fullName || operative.id}
                                            </p>
                                            <p className="text-xs text-slate-600">{operative.trade}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">Assigned</Badge>

                                            {/* Actions */}
                                            <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                                title="Mark as current"
                                                onClick={async () => {
                                                try {
                                                    const target = assignments.find(
                                                    (a) =>
                                                        String(a.siteId) === String(site.id) &&
                                                        String(a.operativeId) === String(operative.id)
                                                    )
                                                    if (!target) {
                                                    toast({
                                                        title: "No assignment found",
                                                        description:
                                                        "Could not locate this operative's assignment for the site.",
                                                    })
                                                    return
                                                    }
                                                    const res = await fetch(`/api/assignments?id=${target.id}`, {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ ...target, status: "DEPLOYED" }), // make ACTIVE
                                                    })
                                                    if (!res.ok) throw new Error("Failed to update assignment")
                                                    await fetchAssignments()
                                                    toast({ title: "Assignment updated", description: "Marked as current." })
                                                } catch (e) {
                                                    console.error(e)
                                                    toast({ title: "Update failed", description: "Could not update status." })
                                                }
                                                }}
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 hover:text-red-700"
                                                title="Remove from site"
                                                onClick={async () => {
                                                try {
                                                    const target = assignments.find(
                                                    (a) =>
                                                        String(a.siteId) === String(site.id) &&
                                                        String(a.operativeId) === String(operative.id)
                                                    )
                                                    if (!target) {
                                                    toast({
                                                        title: "No assignment found",
                                                        description: "Nothing to remove for this operative at this site.",
                                                    })
                                                    return
                                                    }
                                                    const res = await fetch(`/api/assignments?id=${target.id}`, {
                                                    method: "DELETE",
                                                    })
                                                    if (!res.ok) throw new Error("Failed to delete assignment")
                                                    await fetchAssignments()
                                                    toast({
                                                    title: "Operative removed",
                                                    description: "Unassigned from the site.",
                                                    })
                                                    if (editingSite?.id === site.id) {
                                                    setSelectedOperatives((prev) =>
                                                        prev.filter((id) => id !== operative.id)
                                                    )
                                                    }
                                                } catch (e) {
                                                    console.error(e)
                                                    toast({ title: "Removal failed", description: "Could not remove operative." })
                                                }
                                                }}
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </Button>
                                            </div>
                                        </div>
                                        </div>
                                    ))
                                    ) : (
                                    <p className="text-sm text-slate-600 py-4 text-center">No operatives assigned yet</p>
                                    )}
                                </>
                                )
                            })()}
                          </TabsContent>
                        {/* CURRENT WEEK OPERATIVES TAB */} 
                          {/* CURRENT WEEK OPERATIVES TAB */}
                          <TabsContent value="current" className="space-y-2">
                            {(() => {
                                const activeIds = new Set(
                                assignments
                                    .filter(
                                    (a) =>
                                        String(a.siteId) === String(site.id) &&
                                        String(a.status).toUpperCase() === "DEPLOYED"
                                    )
                                    .map((a) => String(a.operativeId))
                                )
                                const activeOps = assignedOperatives.filter((o) => activeIds.has(String(o.id)))

                                return activeOps.length > 0 ? (
                                activeOps.map((operative) => (
                                    <div
                                    key={operative.id}
                                    className="bg-green-50 p-4 rounded border-l-4 border-green-400 flex items-center justify-between"
                                    >
                                    <div>
                                        <p className="font-medium text-sm">
                                        {operative.personalDetails?.fullName || operative.id}
                                        </p>
                                        <p className="text-xs text-slate-600">{operative.trade}</p>
                                        <Badge variant="secondary" className="text-xs mt-1">Currently Active</Badge>
                                    </div>
                                    </div>
                                ))
                                ) : (
                                <p className="text-sm text-slate-600 py-4 text-center">No operatives currently on site</p>
                                )
                            })()}
                          </TabsContent>

                        {/* MOVED OFF SITE OPERATIVES TAB */} 
                          <TabsContent value="off-site" className="space-y-2">
                            <p className="text-sm text-slate-600">Use your date range to determine off-site operatives via assignments.</p>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>

                    {/* Assigned operatives summary chips */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Assigned Operatives:</p>
                        <span className="text-xs text-muted-foreground">{assignedOperatives.length}/{site.maxOperatives}</span>
                      </div>
                      {assignedOperatives.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedOperatives.slice(0, 6).map((op) => (
                            <Badge key={op.id} variant="outline" className="text-xs">
                              {op.personalDetails?.fullName || op.id}
                            </Badge>
                          ))}
                          {assignedOperatives.length > 6 && (
                            <Badge variant="outline" className="text-xs">+{assignedOperatives.length - 6} more</Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No operatives assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
              )
            })
          )}
        </div>
        </main>
        
    </div>
  )
}
