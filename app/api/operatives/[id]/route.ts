import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, email, phone, trade, certifications, hourlyRate } = body

    const operative = await prisma.operative.update({
      where: { id: Number(params.id) }, // 🔑 ensure id is a number
      data: {
        name,
        email,
        phone,
        trade,
        certifications,
        hourlyRate: Number.parseFloat(hourlyRate),
      },
    })

    return NextResponse.json(operative)
  } catch (error) {
    console.error("Error updating operative:", error)
    return NextResponse.json({ error: "Failed to update operative" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.operative.delete({
      where: { id: Number(params.id) }, // 🔑 ensure id is a number
    })

    return NextResponse.json({ message: "Operative deleted successfully" })
  } catch (error) {
    console.error("Error deleting operative:", error)
    return NextResponse.json({ error: "Failed to delete operative" }, { status: 500 })
  }
}
