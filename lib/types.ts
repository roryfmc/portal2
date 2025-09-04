// import { SiteOperative } from "@prisma/client"

export interface Operative {
  id: string
  name: string
  email: string
  phone?: string
  trade: string // e.g., "Electrician", "Plumber", "General Laborer"
  status: "available" | "deployed" | "on-leave" | "unavailable"
  createdAt: Date
}

export interface ConstructionSite {
  id: string
  name: string
  address: string
  clientId: string
  projectType: string
  startDate: Date
  endDate: Date
  status: "planning" | "active" | "completed" | "on-hold"
  requiredTrades: string[]
  maxOperatives: number
  createdAt: Date
  operatives?: SiteOperative[]
}

export type SiteOperative = {
  id: number;
  siteId: number;
  operativeId: number;
  startDate: string; // or Date
  endDate: string;   // or Date
  operative: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    trade: string;
    certifications: string[];
    status: string;
    hourlyRate: number;
    createdAt: string;
  };
};

export interface Client {
  id: number
  name: string
  email: string
  phone?: string
  company: string
  contactPerson: string
  createdAt: Date
  sites: ConstructionSite[]
}

export interface SiteAssignment {
  id: string
  operativeId: string
  siteId: string
  startDate: Date
  endDate: Date
  trade: string
  dailyRate: number
  status: "scheduled" | "active" | "completed" | "cancelled"
  notes?: string
  createdAt: Date
}

export interface Manager {
  id: string
  name: string
  email: string
  department: string
  avatar?: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  assignmentId?: string
}

export interface EmailNotification {
  id: string
  type: "assignmentConfirmation" | "assignmentReminder" | "operativeUpdate" | "clientUpdate"
  recipient: string
  subject: string
  status: "sent" | "pending" | "failed"
  sentAt: Date
}

export interface NotificationSettings {
  assignmentConfirmation: boolean
  assignmentReminder: boolean
  operativeUpdates: boolean
  clientNotifications: boolean
  reminderHours: number
}
