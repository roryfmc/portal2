import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const site = await prisma.constructionSite.findUnique({
      where: { id: Number(params.id) },
      include: {
        operatives: {           // include the join table entries
          include: { operative: true } // include full operative details
        }
      },
    })

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    return NextResponse.json(site)
  } catch (error) {
    console.error("Error fetching site:", error)
    return NextResponse.json({ error: "Failed to fetch site" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, address, clientId, projectType, startDate, endDate, requiredTrades, maxOperatives } = body

    const site = await prisma.constructionSite.update({
      where: { id: Number(params.id) },
      data: {
        name,
        address,
        clientId,
        projectType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requiredTrades: Array.isArray(requiredTrades)
          ? requiredTrades
          : requiredTrades.split(",").map((t: string) => t.trim()),
        maxOperatives: Number(maxOperatives),
      },
    })

    return NextResponse.json(site)
  } catch (error) {
    console.error("Error updating site:", error)
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    // Remove assigned operatives first, then delete site
    await prisma.$transaction([
      prisma.siteOperative.deleteMany({ where: { siteId: id } }),
      prisma.constructionSite.delete({ where: { id } }),
    ])

    return NextResponse.json({ message: "Site deleted successfully" })
  } catch (error) {
    console.error("Error deleting site:", error)
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 })
  }
}
