import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, email, phone, company, contactPerson } = body

    const client = await prisma.client.update({
      where: { id: Number(params.id) }, // ensure id is a number
      data: {
        name,
        email,
        phone,
        company: company || null,           // optional
        contactPerson: contactPerson || null, // optional
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.client.delete({
      where: { id: Number(params.id) }, // ensure id is a number
    })

    return NextResponse.json({ message: "Client deleted successfully" })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 })
  }
}
