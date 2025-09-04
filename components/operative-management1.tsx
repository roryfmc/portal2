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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, HardHat, Phone, Mail } from "lucide-react"
import type { Operative } from "@/lib/types"
export function OperativeManagement() {
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingOperative, setEditingOperative] = useState<Operative | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    trade: "",
    // note: we will derive the string[] to send from certEntries
    // hourlyRate: "",
  })
  const [certEntries, setCertEntries] = useState<{ type: string; validUntil: string }[]>([])
  const [newCertType, setNewCertType] = useState<string>("")
  const [newCertDate, setNewCertDate] = useState<string>("")
  const filteredOperatives = operatives.filter(
    (operative) =>
      operative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operative.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operative.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  useEffect(() => {
    fetchOperatives()
    fetchAssignments()
    fetchSites()
  }, [])
  const fetchOperatives = async () => {
    try {
      const response = await fetch("/api/operatives")
      if (response.ok) {
        const data = await response.json()
        const formattedOperatives = data.map((op: any) => ({
          ...op,
          status: op.status.toLowerCase().replace("_", "-"),
          createdAt: new Date(op.createdAt),
        }))
        setOperatives(formattedOperatives)
      }
    } catch (error) {
      console.error("Error fetching operatives:", error)
    } finally {
      setLoading(false)
    }
  }
  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments")
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      }
    } catch (e) {
      console.error("Error fetching assignments:", e)
    }
  }
  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites")
      if (res.ok) {
        const data = await res.json()
        setSites(data)
      }
    } catch (e) {
      console.error("Error fetching sites:", e)
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const operativeData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      trade: formData.trade,
      certifications: certEntries.map((c) =>
        c.validUntil ? `${c.type} (valid until ${c.validUntil})` : c.type
      ),
      // hourlyRate: formData.hourlyRate,
    }
    try {
      if (editingOperative) {
        const response = await fetch(`/api/operatives/${editingOperative.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operativeData),
        })
        if (response.ok) {
          await fetchOperatives()
        }
      } else {
        const response = await fetch("/api/operatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operativeData),
        })
        if (response.ok) {
          await fetchOperatives()
        }
      }
      resetForm()
    } catch (error) {
      console.error("Error saving operative:", error)
    }
  }
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      trade: "",
      // hourlyRate: "",
    })
    setCertEntries([])
    setNewCertType("")
    setNewCertDate("")
    setEditingOperative(null)
    setIsAddDialogOpen(false)
  }
  const handleEdit = (operative: Operative) => {
    setEditingOperative(operative)
    setFormData({
      name: operative.name,
      email: operative.email,
      phone: operative.phone || "",
      trade: operative.trade,
      // hourlyRate: operative.hourlyRate.toString(),
    })
    // parse existing certifications into entries if they include a "(valid until ...)" suffix
    const parsed = (operative.certifications || []).map((s: string) => {
      const m = s.match(/^(.+?)\s*\(valid until\s+([^)]+)\)$/i)
      if (m) return { type: m[1], validUntil: m[2] }
      return { type: s, validUntil: "" }
    })
    setCertEntries(parsed)
    setNewCertType("")
    setNewCertDate("")
    setIsAddDialogOpen(true)
  }
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/operatives/${Number(id)}`, {
        method: "DELETE",
      })
      if (response.ok) {
        await fetchOperatives()
      }
    } catch (error) {
      console.error("Error deleting operative:", error)
    }
  }
  const getStatusColor = (status: Operative["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "deployed":
        return "bg-red-100 text-red-800"
      case "on-leave":
        return "bg-yellow-100 text-yellow-800"
      case "unavailable":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  const isOnActiveSiteNow = (operativeId: string) => {
    const now = new Date()
    return assignments.some((a: any) => {
      const start = new Date(a.startDate)
      const end = new Date(a.endDate)
      return (
        String(a.operativeId) === String(operativeId) &&
        start <= now &&
        end >= now
      )
    })
  }
  const getDisplayStatus = (operative: Operative): Operative["status"] => {
    // If operative is on an active site now, treat as deployed; else available
    return isOnActiveSiteNow(operative.id) ? "deployed" : "available"
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading operatives...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operative Management</h1>
          <p className="text-muted-foreground">Manage your temporary construction operatives</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Operative
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingOperative ? "Edit Operative" : "Add New Operative"}</DialogTitle>
              <DialogDescription>
                {editingOperative ? "Update operative information" : "Add a new temporary operative to your workforce"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade">Trade</Label>
                  <Select value={formData.trade} onValueChange={(value) => setFormData({ ...formData, trade: value })}>
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
              <div className="space-y-2">
                <Label>Certifications</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Certification Type</Label>
                    <Select value={newCertType} onValueChange={setNewCertType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select certificate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSCS Card">CSCS Card</SelectItem>
                        <SelectItem value="First Aid">First Aid</SelectItem>
                        <SelectItem value="Asbestos Awareness">Asbestos Awareness</SelectItem>
                        <SelectItem value="SMSTS">SMSTS</SelectItem>
                        <SelectItem value="SSSTS">SSSTS</SelectItem>
                        <SelectItem value="PASMA">PASMA</SelectItem>
                        <SelectItem value="IPAF">IPAF</SelectItem>
                        <SelectItem value="Confined Spaces">Confined Spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input id="validUntil" type="date" value={newCertDate} onChange={(e) => setNewCertDate(e.target.value)} />
                  </div>
                  <div className="flex items-end md:col-span-1">
                    <Button type="button" onClick={() => {
                      if (!newCertType) return
                      setCertEntries([...certEntries, { type: newCertType, validUntil: newCertDate }])
                      setNewCertType("")
                      setNewCertDate("")
                    }}>Add Certification</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {certEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No certifications added</p>
                  ) : (
                    certEntries.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between border rounded-md p-2 text-sm">
                        <span>{c.type}{c.validUntil ? ` (valid until ${c.validUntil})` : ""}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => setCertEntries(certEntries.filter((_, i) => i !== idx))}>Remove</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (£)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingOperative ? "Update" : "Add"} Operative</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search operatives by name, trade, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOperatives.map((operative) => (
          <Card key={operative.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardHat className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{operative.name}</CardTitle>
                </div>
                {(() => {
                  const status = getDisplayStatus(operative)
                  const label = status === "deployed" ? "Deployed" : "Available"
                  return <Badge className={getStatusColor(status)}>{label}</Badge>
                })()}
              </div>
              <CardDescription className="font-medium text-primary">{operative.trade}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{operative.email}</span>
                </div>
                {operative.phone && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{operative.phone}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Hourly Rate: ��{operative.hourlyRate}</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Certifications:</p>
                  <div className="flex flex-wrap gap-1">
                    {operative.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Assignments:</p>
                {(() => {
                  const ops = (assignments || [])
                    .filter((a: any) => String(a.operativeId) === String(operative.id))
                    .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  if (ops.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">No assignments</p>
                  }
                  return (
                    <div className="space-y-1">
                      {ops.slice(0, 3).map((a: any) => {
                        const siteName = a.site?.name || (sites.find((s: any) => String(s.id) === String(a.siteId))?.name ?? `Site ${a.siteId}`)
                        const sd = new Date(a.startDate)
                        const ed = new Date(a.endDate)
                        const range = `${sd.toLocaleDateString()} - ${ed.toLocaleDateString()}`
                        return (
                          <div key={a.id} className="text-xs text-muted-foreground flex items-center justify-between">
                            <span className="truncate mr-2">{siteName}</span>
                            <span className="shrink-0">{range}</span>
                          </div>
                        )
                      })}
                      {ops.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{ops.length - 3} more</p>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(operative)} className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(operative.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredOperatives.length === 0 && (
        <div className="text-center py-12">
          <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No operatives found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Add your first operative to get started"}
          </p>
        </div>
      )}
    </div>
  )
}