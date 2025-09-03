import type { Operative, Manager, SiteAssignment, ConstructionSite, Client } from "./types"

export const mockOperatives: Operative[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1 (555) 123-4567",
    trade: "Electrician",
    certifications: ["Level 3 Electrical Installation", "18th Edition Wiring Regulations"],
    status: "available",
    hourlyRate: 25,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Maria Garcia",
    email: "maria.garcia@email.com",
    phone: "+1 (555) 234-5678",
    trade: "Plumber",
    certifications: ["City & Guilds Plumbing", "Gas Safe Registered"],
    status: "deployed",
    hourlyRate: 28,
    createdAt: new Date("2024-01-16"),
  },
  {
    id: "3",
    name: "David Brown",
    email: "david.brown@email.com",
    trade: "General Laborer",
    certifications: ["CSCS Card", "Manual Handling"],
    status: "available",
    hourlyRate: 18,
    createdAt: new Date("2024-01-17"),
  },
]

export const mockClients: Client[] = [
  {
    id: "1",
    name: "BuildCorp Ltd",
    email: "projects@buildcorp.com",
    phone: "+1 (555) 987-6543",
    company: "BuildCorp Ltd",
    contactPerson: "Sarah Wilson",
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "2",
    name: "Metro Construction",
    email: "info@metroconstruction.com",
    phone: "+1 (555) 876-5432",
    company: "Metro Construction",
    contactPerson: "James Miller",
    createdAt: new Date("2024-01-12"),
  },
]

export const mockConstructionSites: ConstructionSite[] = [
  {
    id: "1",
    name: "Riverside Office Complex",
    address: "123 River Street, Downtown",
    clientId: "1",
    projectType: "Commercial Office Building",
    startDate: new Date("2024-01-20"),
    endDate: new Date("2024-06-30"),
    status: "active",
    requiredTrades: ["Electrician", "Plumber", "General Laborer"],
    maxOperatives: 15,
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "2",
    name: "Maple Heights Residential",
    address: "456 Maple Avenue, Suburbs",
    clientId: "2",
    projectType: "Residential Development",
    startDate: new Date("2024-02-01"),
    endDate: new Date("2024-08-15"),
    status: "planning",
    requiredTrades: ["Electrician", "Plumber", "Carpenter"],
    maxOperatives: 20,
    createdAt: new Date("2024-01-15"),
  },
]

export const mockManagers: Manager[] = [
  {
    id: "1",
    name: "Alex Thompson",
    email: "alex.thompson@company.com",
    department: "Site Operations",
    avatar: "/recruiter-avatar.png",
  },
  {
    id: "2",
    name: "Jessica Park",
    email: "jessica.park@company.com",
    department: "Project Management",
    avatar: "/recruiter-avatar.png",
  },
  {
    id: "3",
    name: "Robert Davis",
    email: "robert.davis@company.com",
    department: "Workforce Coordination",
    avatar: "/recruiter-avatar.png",
  },
]

export const mockSiteAssignments: SiteAssignment[] = [
  {
    id: "1",
    operativeId: "2",
    siteId: "1",
    startDate: new Date("2024-01-22"),
    endDate: new Date("2024-02-22"),
    trade: "Plumber",
    dailyRate: 224, // 28 * 8 hours
    status: "active",
    notes: "Working on main building plumbing installation",
    createdAt: new Date("2024-01-18"),
  },
]
