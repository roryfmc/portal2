"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2, Building, Phone, Mail, User, Briefcase, PoundSterling, List } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { Client, ClientJobType } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [jobTypes, setJobTypes] = useState<Array<{ id: string; name: string; payRate: string; clientCost: string }>>([])

  const formatDate = (value: string | Date | undefined | null) => {
    if (!value) return "-"
    const d = new Date(value)
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  }

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contactPerson: "",
  })

  // Fetch clients from backend
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch((err) => console.error("Failed to fetch clients", err))
  }, [])

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const clientData: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      contactPerson: formData.contactPerson,
    }

    // Attach job types payload if present
    if (jobTypes.length) {
      clientData.jobTypes = jobTypes
        .filter((j) => j.name.trim())
        .map((j) => ({ name: j.name.trim(), payRate: Number(j.payRate || 0), clientCost: Number(j.clientCost || 0) }))
    }

    try {
      if (editingClient) {
        // Update client
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        })
        if (res.ok) {
          const updatedClient = await res.json()
          setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)))
        }
      } else {
        // Add new client
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        })
        if (res.ok) {
          const newClient = await res.json()
          setClients([...clients, newClient])
        }
      }
    } catch (error) {
      console.error("Error saving client:", error)
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      contactPerson: "",
    })
    setEditingClient(null)
    setIsAddDialogOpen(false)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      company: client.company,
      contactPerson: client.contactPerson,
    })
    setJobTypes(
      (client.jobTypes || []).map((jt: ClientJobType) => ({
        id: String(jt.id),
        name: jt.name,
        payRate: String(jt.payRate ?? ""),
        clientCost: String(jt.clientCost ?? ""),
      })),
    )
    setActiveTab("details")
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      if (res.ok) {
        setClients(clients.filter((client) => client.id !== id))
      } else {
        const body = await res.json().catch(() => ({}))
        toast({
          title: "Cannot delete client",
          description: body?.error || "Client has associated sites. Remove them first.",
        })
      }
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({ title: "Delete failed", description: "An unexpected error occurred." })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage your construction project clients</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              <DialogDescription>
                {editingClient ? "Update client information" : "Add a new client to your database"}
              </DialogDescription>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Details
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Job Types & Rates
                </TabsTrigger>
                <TabsTrigger value="sites" className="flex items-center gap-2">
                  <List className="w-4 h-4" /> Sites
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Client Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingClient ? "Update" : "Add"} Client</Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="jobs" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Job Types</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setJobTypes((prev) => [...prev, { id: `${Date.now()}`, name: "", payRate: "", clientCost: "" }])}
                  >
                    + Add Job Type
                  </Button>
                </div>
                <div className="space-y-3">
                  {jobTypes.length === 0 && <p className="text-sm text-muted-foreground">No job types added</p>}
                  {jobTypes.map((jt, idx) => (
                    <div key={jt.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <Label>Job Type</Label>
                        <Input value={jt.name} onChange={(e) => setJobTypes((prev) => prev.map((j, i) => (i === idx ? { ...j, name: e.target.value } : j)))} />
                      </div>
                      <div>
                        <Label>Pay Rate</Label>
                        <Input type="number" placeholder="0.00" value={jt.payRate}
                          onChange={(e) => setJobTypes((prev) => prev.map((j, i) => (i === idx ? { ...j, payRate: e.target.value } : j)))} />
                      </div>
                      <div>
                        <Label>Client Cost</Label>
                        <Input type="number" placeholder="0.00" value={jt.clientCost}
                          onChange={(e) => setJobTypes((prev) => prev.map((j, i) => (i === idx ? { ...j, clientCost: e.target.value } : j)))} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setJobTypes((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    onClick={async () => {
                      if (!editingClient) {
                        toast({ title: "Save client first", description: "Create the client before saving job types." })
                        return
                      }
                      try {
                        const payload = {
                          jobTypes: jobTypes
                            .filter((j) => j.name.trim())
                            .map((j) => ({ name: j.name.trim(), payRate: Number(j.payRate || 0), clientCost: Number(j.clientCost || 0) })),
                        }
                        const res = await fetch(`/api/clients/${editingClient.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        })
                        if (!res.ok) {
                          const body = await res.json().catch(() => null)
                          throw new Error(body?.error || `Failed (HTTP ${res.status})`)
                        }
                        const updated = (await res.json()) as Client
                        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
                        setEditingClient(updated)
                        setJobTypes((updated.jobTypes || []).map((jt) => ({ id: String(jt.id), name: jt.name, payRate: String(jt.payRate), clientCost: String(jt.clientCost) })))
                        toast({ title: "Job types saved" })
                      } catch (e: any) {
                        toast({ title: "Failed to save job types", description: e?.message || "Unknown error" })
                        console.error(e)
                      }
                    }}
                  >
                    Save Job Types
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="sites" className="space-y-2 mt-4">
                {editingClient?.sites && editingClient.sites.length > 0 ? (
                  <div className="space-y-2">
                    {editingClient.sites.map((site) => (
                      <div key={site.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="font-medium">{site.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(site.startDate as any)} - {formatDate(site.endDate as any)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sites for this client yet.</p>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, company, or contact person..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{client.name}</CardTitle>
              </div>
              <CardDescription className="font-medium text-primary">{client.company}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{client.contactPerson}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>
              {client.sites && client.sites.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Sites:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {client.sites.map((site) => (
                      <li key={site.id}>
                        {site.name}
                        <span className="ml-1 text-muted-foreground">
                          ({formatDate(site.startDate as any)} - {formatDate(site.endDate as any)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}


              <div className="text-xs text-muted-foreground">
                Added: {new Date(client.createdAt).toLocaleDateString()}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(client)} className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(client.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No clients found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Add your first client to get started"}
          </p>
        </div>
      )}
    </div>
  )
}
