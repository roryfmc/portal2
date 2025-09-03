"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Clock, Video, Phone, MapPin } from "lucide-react"
import { mockSiteAssignments, mockOperatives, mockManagers } from "@/lib/data"
import { getStoredAppointments, saveAppointment } from "@/lib/storage"
import { AppointmentBookingModal } from "./appointment-booking-modal"
import type { Appointment } from "@/lib/types"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    const storedAppointments = getStoredAppointments()
    setAppointments([...mockSiteAssignments, ...storedAppointments])
  }, [])

  const handleAppointmentCreated = (newAppointment: Appointment) => {
    saveAppointment(newAppointment)
    setAppointments((prev) => [...prev, newAppointment])
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime)
      return aptDate.toDateString() === date.toDateString()
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-3 w-3" />
      case "phone":
        return <Phone className="h-3 w-3" />
      case "in-person":
        return <MapPin className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const renderCalendarDays = () => {
    const days = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border/50" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const appointments = getAppointmentsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()

      days.push(
        <div
          key={day}
          className={`h-24 border border-border/50 p-1 cursor-pointer hover:bg-accent/50 transition-colors ${
            isToday ? "bg-primary/10 border-primary/30" : ""
          } ${isSelected ? "bg-accent border-accent-foreground" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary font-semibold" : ""}`}>{day}</div>
          <div className="space-y-1">
            {appointments.slice(0, 2).map((apt) => {
              const operative = mockOperatives.find((o) => o.id === apt.candidateId)
              return (
                <div
                  key={apt.id}
                  className="text-xs bg-primary/20 text-primary-foreground px-1 py-0.5 rounded truncate flex items-center gap-1"
                >
                  {getTypeIcon(apt.type)}
                  <span className="truncate">{operative?.name}</span>
                </div>
              )
            })}
            {appointments.length > 2 && (
              <div className="text-xs text-muted-foreground">+{appointments.length - 2} more</div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-balance">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowBookingModal(true)}>
          <Plus className="h-4 w-4" />
          Assign Operative
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="p-3 text-center font-medium text-muted-foreground border-r border-border last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">{renderCalendarDays()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getAppointmentsForDate(selectedDate).map((apt) => {
                  const operative = mockOperatives.find((o) => o.id === apt.candidateId)
                  const manager = mockManagers.find((m) => m.id === apt.recruiterId)

                  return (
                    <div key={apt.id} className="p-3 border border-border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {getTypeIcon(apt.type)}
                          {apt.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(apt.startTime).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{operative?.name}</p>
                        <p className="text-xs text-muted-foreground">{operative?.trade}</p>
                        <p className="text-xs text-muted-foreground">managed by {manager?.name}</p>
                      </div>
                    </div>
                  )
                })}

                {getAppointmentsForDate(selectedDate).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No operatives assigned for this date</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Assignments</span>
                <Badge variant="secondary">{appointments.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Operatives</span>
                <Badge variant="outline">{mockOperatives.filter((o) => o.status === "available").length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">On Site</span>
                <Badge variant="default">{mockOperatives.filter((o) => o.status === "on-site").length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AppointmentBookingModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        selectedDate={selectedDate || undefined}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  )
}
