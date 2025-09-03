"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mockOperatives, mockManagers } from "@/lib/data"
import type { Appointment } from "@/lib/types"

interface AppointmentBookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  onAppointmentCreated: (appointment: Appointment) => void
}

export function AppointmentBookingModal({
  open,
  onOpenChange,
  selectedDate,
  onAppointmentCreated,
}: AppointmentBookingModalProps) {
  const [formData, setFormData] = useState({
    candidateId: "",
    recruiterId: "",
    title: "",
    description: "",
    date: selectedDate || new Date(),
    startTime: "",
    endTime: "",
    type: "video" as "video" | "phone" | "in-person",
    meetingLink: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.candidateId || !formData.recruiterId || !formData.startTime || !formData.endTime) {
      return
    }

    const operative = mockOperatives.find((o) => o.id === formData.candidateId)
    const startDateTime = new Date(formData.date)
    const endDateTime = new Date(formData.date)

    const [startHour, startMinute] = formData.startTime.split(":").map(Number)
    const [endHour, endMinute] = formData.endTime.split(":").map(Number)

    startDateTime.setHours(startHour, startMinute)
    endDateTime.setHours(endHour, endMinute)

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      candidateId: formData.candidateId,
      recruiterId: formData.recruiterId,
      title: formData.title || `Site Assignment - ${operative?.name}`,
      description: formData.description,
      startTime: startDateTime,
      endTime: endDateTime,
      type: formData.type,
      status: "scheduled",
      meetingLink: formData.meetingLink,
      createdAt: new Date(),
    }

    onAppointmentCreated(newAppointment)
    onOpenChange(false)

    setFormData({
      candidateId: "",
      recruiterId: "",
      title: "",
      description: "",
      date: selectedDate || new Date(),
      startTime: "",
      endTime: "",
      type: "video",
      meetingLink: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Operative to Site</DialogTitle>
          <DialogDescription>Create a new site assignment for an operative with a site manager.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candidate">Operative</Label>
              <Select
                value={formData.candidateId}
                onValueChange={(value) => setFormData({ ...formData, candidateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operative" />
                </SelectTrigger>
                <SelectContent>
                  {mockOperatives.map((operative) => (
                    <SelectItem key={operative.id} value={operative.id}>
                      <div>
                        <div className="font-medium">{operative.name}</div>
                        <div className="text-sm text-muted-foreground">{operative.trade}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recruiter">Site Manager</Label>
              <Select
                value={formData.recruiterId}
                onValueChange={(value) => setFormData({ ...formData, recruiterId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site manager" />
                </SelectTrigger>
                <SelectContent>
                  {mockManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      <div>
                        <div className="font-medium">{manager.name}</div>
                        <div className="text-sm text-muted-foreground">{manager.department}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title (Optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Foundation Work, Electrical Installation"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData({ ...formData, date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startTime"
                  type="time"
                  className="pl-10"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endTime"
                  type="time"
                  className="pl-10"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Meeting Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "video" | "phone" | "in-person") => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === "video" && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
              <Input
                id="meetingLink"
                placeholder="https://meet.google.com/..."
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Notes (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes about the site assignment..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign to Site</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
