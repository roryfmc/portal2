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
import { Plus, Search, Edit, Trash2, Building2, MapPin, Calendar, Users } from "lucide-react"
import type { ConstructionSite, Client } from "@/lib/types"

export function SiteManagement() {
  const [sites, setSites] = useState<ConstructionSite[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null)
  const [operatives, setOperatives] = useState<{ id: string; name: string }[]>([])

  

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    clientId: "",
    projectType: "",
    startDate: "",
    endDate: "",
    requiredTrades: "",
    maxOperatives: "",
    assignedOperatives: [] as { operativeId: string; startDate: string; endDate: string }[],
  })

  // Fetch sites and clients from backend
  useEffect(() => {
    fetch("/api/sites")
      .then((res) => res.json())
      .then(setSites)
      .catch((err) => console.error("Failed to fetch sites", err))

    fetch("/api/clients")
      .then((res) => res.json())
      .then(setClients)
      .catch((err) => console.error("Failed to fetch clients", err))
    fetch("/api/operatives")
      .then((res) => res.json())
      .then(setOperatives)
      .catch((err) => console.error("Failed to fetch operatives", err))
  }, [])

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.projectType.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const siteData: ConstructionSite = {
      id: editingSite?.id || Date.now().toString(),
      name: formData.name,
      address: formData.address,
      clientId: formData.clientId,
      projectType: formData.projectType,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: editingSite?.status || "planning",
      requiredTrades: formData.requiredTrades.split(",").map((trade) => trade.trim()),
      maxOperatives: Number.parseInt(formData.maxOperatives),
      createdAt: editingSite?.createdAt || new Date(),
    }

    try {
      if (editingSite) {
        // Update existing site
        const res = await fetch(`/api/sites/${editingSite.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(siteData),
        })
        if (res.ok) {
          setSites(sites.map((site) => (site.id === editingSite.id ? siteData : site)))
        }
      } else {
        // Add new site
        const res = await fetch("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(siteData),
        })
        if (res.ok) {
          const newSite = await res.json()
          setSites([...sites, newSite])
        }
      }
    } catch (error) {
      console.error("Error saving site:", error)
    }

    resetForm()
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
      assignedOperatives: [],
    })
    setEditingSite(null)
    setIsAddDialogOpen(false)
  }

  const handleEdit = (site: ConstructionSite) => {
  setEditingSite(site)
  setFormData({
    name: site.name,
    address: site.address,
    clientId: site.clientId,
    projectType: site.projectType,
    startDate: new Date(site.startDate).toISOString().split("T")[0],
    endDate: new Date(site.endDate).toISOString().split("T")[0],
    requiredTrades: site.requiredTrades.join(", "),
    maxOperatives: site.maxOperatives.toString(),
    assignedOperatives: site.operatives?.map((so) => ({
      operativeId: so.operativeId.toString(),
      startDate: so.startDate,
      endDate: so.endDate,
    })) || [], // default to empty array if no operatives
  })
  setIsAddDialogOpen(true)
}


  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sites/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSites(sites.filter((site) => site.id !== id))
      }
    } catch (error) {
      console.error("Error deleting site:", error)
    }
  }

  const getStatusColor = (status: ConstructionSite["status"]) => {
    switch (status) {
      case "planning":
        return "bg-yellow-100 text-yellow-800"
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "on-hold":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return client?.name || "Unknown Client"
  }

  const getOpName = (operativeId: string) => {
    const operative = operatives.find((c) => c.id === operativeId)
    return operative?.name || "Unknown Client"
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", {
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
          <p className="text-muted-foreground">Manage sites</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSite ? "Edit Site" : "Add New Construction Site"}</DialogTitle>
              <DialogDescription>
                {editingSite ? "Update site information" : "Add a new site"}
              </DialogDescription>
            </DialogHeader>
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
                <Label htmlFor="requiredTrades">Required Trades (comma-separated)</Label>
                <Textarea
                  id="requiredTrades"
                  value={formData.requiredTrades}
                  onChange={(e) => setFormData({ ...formData, requiredTrades: e.target.value })}
                  placeholder="e.g., Electrician, Plumber, General Laborer"
                />
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
              <div className="space-y-2">
                <Label>Assign Operatives</Label>
                <div className="flex flex-wrap gap-2">
                  {operatives.map((op) => {
                    const selected = formData.assignedOperatives.some((a) => a.operativeId === op.id)
                    return (
                      <Button
                        key={op.id}
                        variant={selected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          let updated
                          if (selected) {
                            updated = formData.assignedOperatives.filter((a) => a.operativeId !== op.id)
                          } else {
                            updated = [
                              ...formData.assignedOperatives,
                              { operativeId: op.id, startDate: formData.startDate, endDate: formData.endDate },
                            ]
                          }
                          setFormData({ ...formData, assignedOperatives: updated })
                        }}
                      >
                        {op.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingSite ? "Update" : "Add"} Site</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => (
          <Card key={site.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                </div>
                <Badge className={getStatusColor(site.status)}>{site.status}</Badge>
              </div>
              <CardDescription className="font-medium text-primary">{site.projectType}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{site.address}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Client: {getClientName(site.clientId)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Assigned Operatives: {getOpName(site.clientId)}</span>
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
              {site.operatives && site.operatives.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Assigned Operatives:</p>
                  <div className="flex flex-wrap gap-1">
                    {site.operatives.map((so) => (
                      <Badge key={so.id} variant="outline" className="text-xs">
                        {so.operative.name} ({formatDate(so.startDate)} - {formatDate(so.endDate)})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              

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
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No sites found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Add your first site to get started"}
          </p>
        </div>
      )}
    </div>
  )
}
