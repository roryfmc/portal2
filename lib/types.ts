
export type EmploymentType = "SELF_EMPLOYED" | "CONTRACT" | "TEMPORARY"
export type CertificateStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "INVALID"
// Operative status is now derived from assignments; keep the union if needed elsewhere
export type OperativeStatus = "AVAILABLE" | "DEPLOYED" | "ON_LEAVE" | "UNAVAILABLE"

export interface PersonalDetails {
  id: string
  fullName: string
  email: string
  phone: string
  address: string
  dateOfBirth: string
  nationalInsurance: string
  employmentType: EmploymentType
  payrollNumber: string
  operativeId: string
}

export interface ComplianceCertificate {
  id: string
  name: string
  expiryDate: string
  // Optional legacy fields
  issuer?: string
  issueDate?: string
  status?: CertificateStatus
  documentUrl?: string | null
  notes?: string | null
  // Unified fields
  trainingProvider?: string | null
  contact?: string | null
  certificateDetails?: string | null
  verifiedWith?: string | null
  verifiedBy?: string | null
  dateVerified?: string | null
  certType?: "GENERAL" | "ASBESTOS"
  operativeId: string
}

export interface WorkSite {
  id: string
  siteName: string
  location: string
  startDate: string
  endDate?: string | null
  role: string
  contractor: string
  operativeId: string
}

export interface Operative {
  id: string
  trade?: string
  personalDetails?: PersonalDetails
  complianceCertificates: ComplianceCertificate[]
  workSites: WorkSite[]
  nextOfKin?: NextOfKin | null
  rightToWork?: RightToWork | null
  availability?: Availability | null
  timeOffRequests?: TimeOffRequest[]
  siteAssignments?: SiteAssignment[]
  siteLinks?: any[]
  createdAt: string
  updatedAt: string
  unableToWorkWith?: UnableToWorkWith[]
}

export interface NextOfKin {
  name: string
  relationship: string
  phone: string
  email?: string
  address: string
}

export type RightToWorkStatus = "VERIFIED" | "PENDING" | "EXPIRED" | "NOT_PROVIDED"

export interface RightToWork {
  country: string
  status: RightToWorkStatus
  documentUrl?: string | null
  expiryDate?: string | null
}



export interface TimeOffRequest {
  id: string
  startDate: string
  endDate: string
  reason: string
  status: "Approved" | "Pending" | "Rejected"
}

export interface Availability {
  mondayToFriday: boolean
  saturday: boolean
  sunday: boolean
  nightShifts: boolean
  timeOffRequests: TimeOffRequest[]
  unavailableDates: string[]
}


export interface ConstructionSite {
  id: string
  name: string
  address: string
  clientId: number
  projectType: string
  startDate: Date
  endDate: Date
  status: String
  requiredTrades: string[]
  maxOperatives: number
  createdAt: Date
  operatives?: SiteOperative[]
}

export type SiteOperative = {
  id: number
  siteId: string
  operativeId: string
  startDate: string
  endDate: string
  status?: "AVAILABLE" | "ASSIGNED" | "DEPLOYED"
  operative: {
    id: string
    name: string
    email: string
    phone?: string
    trade: string
    complianceCertificates: ComplianceCertificate[]
    status: string
    createdAt: string
  }
}

export interface Client {
  id: number
  name: string
  email: string
  phone?: string
  company: string
  contactPerson: string
  createdAt: Date
  sites: ConstructionSite[]
  jobTypes?: ClientJobType[]
}

export type UnableTargetType = "OPERATIVE" | "CLIENT"

export interface UnableToWorkWith {
  id: string
  operativeId: string
  targetType: UnableTargetType
  targetOperativeId?: string | null
  targetClientId?: number | null
  note?: string | null
  createdAt?: string | Date
}

export interface ClientJobType {
  id: number
  clientId: number
  name: string
  payRate: number
  clientCost: number
  createdAt: string | Date
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

export interface SimpleOperative {
  id: string
  name: string
  email: string
  phone?: string
  trade: string
  status: "available" | "deployed" | "on-leave" | "unavailable"
  createdAt: Date
}
