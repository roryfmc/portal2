"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Plus, Search, Edit, Trash2, Building2, MapPin, Calendar, Users } from "lucide-react"
import { mockConstructionSites, mockClients } from "@/lib/data"
import type { ConstructionSite, Operative, SiteAssignment, Client } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"

export function SiteManagement() {
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [assignments, setAssignments] = useState<SiteAssignment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null)

  const [operativeSearchTerm, setOperativeSearchTerm] = useState("")
  const [selectedOperatives, setSelectedOperatives] = useState<string[]>([])

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
      // parse date strings to Date objects if your API returns strings
      setSites(
        data.map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          createdAt: new Date(s.createdAt),
        })),
      )
    }
  } catch (err) {
    console.error("Failed to fetch sites:", err)
  }
}

  const getAssignedOperatives = (siteId: string) => {
    const siteAssignments = assignments.filter((assignment) => assignment.siteId === siteId)
    return siteAssignments
      .map((assignment) => operatives.find((operative) => operative.id === assignment.operativeId))
      .filter(Boolean) as Operative[]
  }

  const isOperativeDeployedNow = (operativeId: string) => {
    const now = new Date()
    return assignments.some((a: any) => {
      const start = new Date(a.startDate)
      const end = new Date(a.endDate)
      return String(a.operativeId) === String(operativeId) && start <= now && end >= now
    })
  }

  const handleOperativeAssignment = async () => {
    if (!editingSite) return

    try {
      // Get current assignments for this site
      const currentAssignments = assignments.filter((a) => a.siteId === editingSite.id)
      const currentOperativeIds = currentAssignments.map((a) => a.operativeId)

      // Find operatives to add and remove
      const operativesToAdd = selectedOperatives.filter((id) => !currentOperativeIds.includes(id))
      const operativesToRemove = currentOperativeIds.filter((id) => !selectedOperatives.includes(id))

      // Add new assignments
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

      // Remove assignments
      for (const operativeId of operativesToRemove) {
        const assignmentToRemove = currentAssignments.find((a) => a.operativeId === operativeId)
        if (assignmentToRemove) {
          await fetch(`/api/assignments?id=${assignmentToRemove.id}`, { method: "DELETE" })
        }
      }

      // Refresh assignments
      await fetchAssignments()
    } catch (error) {
      console.error("Failed to update operative assignments:", error)
    }
  }

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.projectType.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredOperatives = operatives.filter(
    (operative) =>
      operative.name.toLowerCase().includes(operativeSearchTerm.toLowerCase()) ||
      operative.trade.toLowerCase().includes(operativeSearchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  const siteData: ConstructionSite = {
    id: editingSite?.id || undefined, // let the server create id
    name: formData.name,
    address: formData.address,
    clientId: formData.clientId,
    projectType: formData.projectType,
    startDate: new Date(formData.startDate),
    endDate: new Date(formData.endDate),
    status: editingSite?.status || "planning",
    requiredTrades: formData.requiredTrades.split(",").map((t) => t.trim()),
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
    }
    if (editingSite) {
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

    await fetchSites() // refresh list
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
      maxOperatives: site.maxOperatives.toString(),
    })
    const assignedOperatives = getAssignedOperatives(site.id)
    setSelectedOperatives(assignedOperatives.map((op) => op.id))
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
    if (!maxOperatives || maxOperatives <= 0) {
      return { label: "NOT FILLED", className: "bg-red-100 text-red-800" }
    }
    if (assignedCount >= maxOperatives) {
      return { label: "FILLED", className: "bg-green-100 text-green-800" }
    }
    if (assignedCount > 0) {
      return { label: "PARTIALLY FILLED", className: "bg-yellow-100 text-yellow-800" }
    }
    return { label: "not filled", className: "bg-red-100 text-red-800" }
  }

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return client?.name || "Unknown Client"
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

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

              <TabsContent value="details" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ... existing form fields ... */}
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
                    <Label htmlFor="projectType">Project Type</Label>
                    <Select
                      value={formData.projectType}
                      onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Residential Development">Residential Development</SelectItem>
                        <SelectItem value="Commercial Office Building">Commercial Office Building</SelectItem>
                        <SelectItem value="Industrial Facility">Industrial Facility</SelectItem>
                        <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="Renovation">Renovation</SelectItem>
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

              <TabsContent value="operatives" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search operatives by name or trade..."
                      value={operativeSearchTerm}
                      onChange={(e) => setOperativeSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredOperatives.map((operative) => (
                      <div key={operative.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedOperatives.includes(operative.id)}
                          disabled={
                            !selectedOperatives.includes(operative.id) &&
                            Number(formData.maxOperatives || (editingSite?.maxOperatives ?? 0)) > 0 &&
                            selectedOperatives.length >= Number(formData.maxOperatives || (editingSite?.maxOperatives ?? 0))
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
                              if (isOperativeDeployedNow(operative.id)) {
                                const ok = window.confirm(
                                  `${operative.name} is currently deployed on another site. Assign to multiple sites?`
                                )
                                if (!ok) return
                              }
                              setSelectedOperatives([...selectedOperatives, operative.id])
                            } else {
                              setSelectedOperatives(selectedOperatives.filter((id) => id !== operative.id))
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{operative.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {operative.trade} • £{operative.hourlyRate}/hr
                          </p>
                        </div>
                        <Badge variant={isOperativeDeployedNow(operative.id) ? "destructive" : "default"}>
                          {isOperativeDeployedNow(operative.id) ? "Deployed" : "Available"}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {filteredOperatives.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No operatives found matching your search</p>
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

      {/* ... existing search input ... */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sites by name, address, or project type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => {
          const assignedOperatives = getAssignedOperatives(site.id)

          const fill = getFillBadge(assignedOperatives.length, site.maxOperatives)

          return (
            <Card key={site.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                  </div>
                  <Badge className={fill.className}>{fill.label}</Badge>
                </div>
                <CardDescription className="font-medium text-primary">{site.projectType}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* ... existing content ... */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{site.address}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Client: {getClientName(site.clientId)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
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
                      {assignedOperatives.slice(0, 3).map((operative) => (
                        <Badge key={operative.id} variant="outline" className="text-xs">
                          {operative.name}
                        </Badge>
                      ))}
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

                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(site)} className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(site.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ... existing empty state ... */}
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
