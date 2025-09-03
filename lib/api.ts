import type { Operative, Manager, SiteAssignment, ConstructionSite, Client } from "./types";

const BASE_URL = "http://localhost:5000"; // Your backend URL

// --- OPERATIVES ---
export async function getOperatives(): Promise<Operative[]> {
  const res = await fetch(`${BASE_URL}/operatives`);
  return res.json();
}

export async function addOperative(operative: Omit<Operative, "id" | "createdAt">): Promise<Operative> {
  const res = await fetch(`${BASE_URL}/operatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operative),
  });
  return res.json();
}

// --- CLIENTS ---
export async function getClients(): Promise<Client[]> {
  const res = await fetch(`${BASE_URL}/clients`);
  return res.json();
}

export async function addClient(client: Omit<Client, "id" | "createdAt">): Promise<Client> {
  const res = await fetch(`${BASE_URL}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(client),
  });
  return res.json();
}

// --- CONSTRUCTION SITES ---
export async function getConstructionSites(): Promise<ConstructionSite[]> {
  const res = await fetch(`${BASE_URL}/sites`);
  return res.json();
}

export async function addConstructionSite(site: Omit<ConstructionSite, "id" | "createdAt">): Promise<ConstructionSite> {
  const res = await fetch(`${BASE_URL}/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(site),
  });
  return res.json();
}

// --- MANAGERS ---
export async function getManagers(): Promise<Manager[]> {
  const res = await fetch(`${BASE_URL}/managers`);
  return res.json();
}

// --- SITE ASSIGNMENTS ---
export async function getSiteAssignments(): Promise<SiteAssignment[]> {
  const res = await fetch(`${BASE_URL}/assignments`);
  return res.json();
}

export async function addSiteAssignment(assignment: Omit<SiteAssignment, "id" | "createdAt">): Promise<SiteAssignment> {
  const res = await fetch(`${BASE_URL}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assignment),
  });
  return res.json();
}
