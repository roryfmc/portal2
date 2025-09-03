import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

// GET all sites
export async function GET() {
  try {
    const sites = await prisma.constructionSite.findMany({
      include: {
        operatives: {
          include: {
            operative: true, // fetch the operative info
          },
        },
        client: true, // fetch the client info
      },
    });
    return NextResponse.json(sites)
  } catch (error) {
    console.error("Error fetching sites:", error)
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 })
  }
}

// POST create a new site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, clientId, projectType, startDate, endDate, requiredTrades, maxOperatives } = body

    const site = await prisma.constructionSite.create({
      data: {
        name,
        address,
        clientId: clientId ? Number(clientId) : null,
        projectType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "planning",
        requiredTrades: Array.isArray(requiredTrades)
          ? requiredTrades
          : requiredTrades.split(",").map((t: string) => t.trim()),
        maxOperatives: Number(maxOperatives),
      },
    })

    return NextResponse.json(site)
  } catch (error) {
    console.error("Error creating site:", error)
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 })
  }
}
