import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { Prisma } from "@prisma/client"

// PUT (unchanged conceptually; keep Number() because id is Int)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, email, phone, company, contactPerson, jobTypes } = body

    const id = Number(params.id)

    const updates = await prisma.client.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(typeof phone !== "undefined" ? { phone: phone ?? null } : {}),
        ...(company ? { company } : {}),
        ...(contactPerson ? { contactPerson } : {}),
      },
    })

    if (Array.isArray(jobTypes)) {
      // Replace existing job types with provided list
      await prisma.$transaction([
        prisma.clientJobType.deleteMany({ where: { clientId: id } }),
        ...(jobTypes.length
          ? [
              prisma.clientJobType.createMany({
                data: jobTypes
                  .filter((j: any) => j?.name)
                  .map((j: any) => ({
                    clientId: id,
                    name: String(j.name),
                    payRate: new Prisma.Decimal(j.payRate ?? 0),
                    clientCost: new Prisma.Decimal(j.clientCost ?? 0),
                  })),
              }),
            ]
          : []),
      ])
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { sites: true, jobTypes: true },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 })
  }
}

// DELETE (handles potential FK constraint by deleting child sites first)
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)

    const siteCount = await prisma.constructionSite.count({ where: { clientId: id } })
    if (siteCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete client with active sites. Detach or delete sites first." },
        { status: 409 }
      )
    }

    await prisma.client.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 })
  }
}
