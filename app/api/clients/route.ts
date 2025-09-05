import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"
import { Prisma } from "@prisma/client"

// GET all clients
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        sites: true,
        jobTypes: true,
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  }
}


// POST create a new client
// app/api/clients/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, contactPerson, jobTypes } = body

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phone ?? null, // phone is optional in schema
        company, // required
        contactPerson, // required
        ...(Array.isArray(jobTypes) && jobTypes.length
          ? {
              jobTypes: {
                create: jobTypes
                  .filter((j: any) => j?.name)
                  .map((j: any) => ({
                    name: String(j.name),
                    payRate: new Prisma.Decimal(j.payRate ?? 0),
                    clientCost: new Prisma.Decimal(j.clientCost ?? 0),
                  })),
              },
            }
          : {}),
      },
      include: { sites: true, jobTypes: true },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }
}

