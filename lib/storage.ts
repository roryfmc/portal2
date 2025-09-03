import type { Appointment, Candidate, Recruiter, EmailNotification, NotificationSettings } from "./types"

const APPOINTMENTS_KEY = "recruitment-appointments"
const CANDIDATES_KEY = "recruitment-candidates"
const RECRUITERS_KEY = "recruitment-recruiters"
const NOTIFICATIONS_KEY = "recruitment-notifications"
const NOTIFICATION_SETTINGS_KEY = "recruitment-notification-settings"

// Appointments
export function getStoredAppointments(): Appointment[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(APPOINTMENTS_KEY)
    if (!stored) return []

    const appointments = JSON.parse(stored)
    return appointments.map((apt: any) => ({
      ...apt,
      startTime: new Date(apt.startTime),
      endTime: new Date(apt.endTime),
      createdAt: new Date(apt.createdAt),
    }))
  } catch {
    return []
  }
}

export function saveAppointment(appointment: Appointment): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredAppointments()
    const updated = [...existing, appointment]
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save appointment:", error)
  }
}

export function updateAppointment(appointmentId: string, updates: Partial<Appointment>): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredAppointments()
    const updated = existing.map((apt) => (apt.id === appointmentId ? { ...apt, ...updates } : apt))
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to update appointment:", error)
  }
}

export function deleteAppointment(appointmentId: string): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredAppointments()
    const updated = existing.filter((apt) => apt.id !== appointmentId)
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to delete appointment:", error)
  }
}

// Candidates
export function getStoredCandidates(): Candidate[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(CANDIDATES_KEY)
    if (!stored) return []

    const candidates = JSON.parse(stored)
    return candidates.map((candidate: any) => ({
      ...candidate,
      createdAt: new Date(candidate.createdAt),
    }))
  } catch {
    return []
  }
}

export function saveCandidate(candidate: Candidate): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredCandidates()
    const updated = [...existing, candidate]
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save candidate:", error)
  }
}

export function updateCandidate(candidateId: string, updates: Partial<Candidate>): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredCandidates()
    const updated = existing.map((candidate) =>
      candidate.id === candidateId ? { ...candidate, ...updates } : candidate,
    )
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to update candidate:", error)
  }
}

export function deleteCandidate(candidateId: string): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredCandidates()
    const updated = existing.filter((candidate) => candidate.id !== candidateId)
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to delete candidate:", error)
  }
}

// Recruiters
export function getStoredRecruiters(): Recruiter[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(RECRUITERS_KEY)
    if (!stored) return []

    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveRecruiter(recruiter: Recruiter): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredRecruiters()
    const updated = [...existing, recruiter]
    localStorage.setItem(RECRUITERS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save recruiter:", error)
  }
}

export function updateRecruiter(recruiterId: string, updates: Partial<Recruiter>): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredRecruiters()
    const updated = existing.map((recruiter) =>
      recruiter.id === recruiterId ? { ...recruiter, ...updates } : recruiter,
    )
    localStorage.setItem(RECRUITERS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to update recruiter:", error)
  }
}

export function deleteRecruiter(recruiterId: string): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredRecruiters()
    const updated = existing.filter((recruiter) => recruiter.id !== recruiterId)
    localStorage.setItem(RECRUITERS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to delete recruiter:", error)
  }
}

// Email Notifications
export function getStoredNotifications(): EmailNotification[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!stored) return []

    const notifications = JSON.parse(stored)
    return notifications.map((notification: any) => ({
      ...notification,
      sentAt: new Date(notification.sentAt),
    }))
  } catch {
    return []
  }
}

export function saveNotification(notification: EmailNotification): void {
  if (typeof window === "undefined") return

  try {
    const existing = getStoredNotifications()
    const updated = [notification, ...existing]
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save notification:", error)
  }
}

// Notification Settings
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") {
    return {
      interviewConfirmation: true,
      interviewReminder: true,
      candidateUpdates: true,
      recruiterNotifications: true,
      reminderHours: 24,
    }
  }

  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (!stored) {
      return {
        interviewConfirmation: true,
        interviewReminder: true,
        candidateUpdates: true,
        recruiterNotifications: true,
        reminderHours: 24,
      }
    }

    return JSON.parse(stored)
  } catch {
    return {
      interviewConfirmation: true,
      interviewReminder: true,
      candidateUpdates: true,
      recruiterNotifications: true,
      reminderHours: 24,
    }
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error("Failed to save notification settings:", error)
  }
}
