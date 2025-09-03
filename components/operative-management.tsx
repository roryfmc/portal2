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
import { Plus, Search, Edit, Trash2, HardHat, Phone, Mail } from "lucide-react"
import type { Operative } from "@/lib/types"

export function OperativeManagement() {
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingOperative, setEditingOperative] = useState<Operative | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    trade: "",
    certifications: "",
    hourlyRate: "",
  })

  const filteredOperatives = operatives.filter(
    (operative) =>
      operative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operative.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operative.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  useEffect(() => {
    fetchOperatives()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const operativeData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      trade: formData.trade,
      certifications: formData.certifications.split(",").map((cert) => cert.trim()),
      hourlyRate: formData.hourlyRate,
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
      certifications: "",
      hourlyRate: "",
    })
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
      certifications: operative.certifications.join(", "),
      hourlyRate: operative.hourlyRate.toString(),
    })
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
        return "bg-blue-100 text-blue-800"
      case "on-leave":
        return "bg-yellow-100 text-yellow-800"
      case "unavailable":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
                <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                <Textarea
                  id="certifications"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="e.g., CSCS Card, Level 3 Electrical Installation"
                />
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
                <Badge className={getStatusColor(operative.status)}>{operative.status}</Badge>
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
                <p className="text-sm font-medium">Hourly Rate: £{operative.hourlyRate}</p>
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
