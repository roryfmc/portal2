import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

// GET all clients
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        sites: true
      }
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
    const { name, email, phone, company, contactPerson } = body

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phone ?? null,     // phone is optional in schema
        company,                  // required
        contactPerson,            // required
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }
}

