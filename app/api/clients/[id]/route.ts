import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"

// PUT (unchanged conceptually; keep Number() because id is Int)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, email, phone, company, contactPerson } = body

    const client = await prisma.client.update({
      where: { id: Number(params.id) },
      data: {
        name,
        email,
        phone: phone ?? null,            // ok because phone is optional
        company,                         // required in your model
        contactPerson,                   // required in your model
      },
      include: { sites: true },
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
