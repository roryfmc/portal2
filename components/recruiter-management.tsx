"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Mail, Building } from "lucide-react"
import { mockManagers } from "@/lib/data"
import { getStoredRecruiters, saveRecruiter, updateRecruiter, deleteRecruiter } from "@/lib/storage"
import type { Recruiter } from "@/lib/types"

export function RecruiterManagement() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecruiter, setEditingRecruiter] = useState<Recruiter | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    avatar: "",
  })

  useEffect(() => {
    const storedRecruiters = getStoredRecruiters()
    setRecruiters([...mockManagers, ...storedRecruiters])
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      department: "",
      avatar: "",
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.department) {
      return
    }

    if (editingRecruiter) {
      const updatedRecruiter: Recruiter = {
        ...editingRecruiter,
        ...formData,
      }
      updateRecruiter(editingRecruiter.id, formData)
      setRecruiters((prev) => prev.map((r) => (r.id === editingRecruiter.id ? updatedRecruiter : r)))
      setEditingRecruiter(null)
    } else {
      const newRecruiter: Recruiter = {
        id: Date.now().toString(),
        ...formData,
      }
      saveRecruiter(newRecruiter)
      setRecruiters((prev) => [...prev, newRecruiter])
    }

    setShowAddModal(false)
    resetForm()
  }

  const handleEdit = (recruiter: Recruiter) => {
    setEditingRecruiter(recruiter)
    setFormData({
      name: recruiter.name,
      email: recruiter.email,
      department: recruiter.department,
      avatar: recruiter.avatar || "",
    })
    setShowAddModal(true)
  }

  const handleDelete = (recruiterId: string) => {
    deleteRecruiter(recruiterId)
    setRecruiters((prev) => prev.filter((r) => r.id !== recruiterId))
  }

  const filteredRecruiters = recruiters.filter(
    (recruiter) =>
      recruiter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recruiter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recruiter.department.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-balance">Recruiter Management</h2>
          <p className="text-muted-foreground">Manage your recruitment team</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Recruiter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recruiters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recruiter</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecruiters.map((recruiter) => (
                <TableRow key={recruiter.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={recruiter.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{getInitials(recruiter.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{recruiter.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {recruiter.department}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {recruiter.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(recruiter)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(recruiter.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRecruiters.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No recruiters found matching your search.</div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open)
          if (!open) {
            setEditingRecruiter(null)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecruiter ? "Edit Recruiter" : "Add New Recruiter"}</DialogTitle>
            <DialogDescription>
              {editingRecruiter ? "Update recruiter information" : "Add a new recruiter to your team"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
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

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL (Optional)</Label>
              <Input
                id="avatar"
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingRecruiter ? "Update" : "Add"} Recruiter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
