// app/api/operatives/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * PUT /api/operatives/:id
 * Update core operative fields and/or nested personalDetails via upsert.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id // ⚠️ string UUID — do NOT cast to Number
    const body = await request.json()

    const { trade, personalDetails, nextOfKin, rightToWork, availability } = body ?? {}

    const updated = await prisma.operative.update({
      where: { id },
      data: {
        ...(trade ? { trade } : {}),
        ...(personalDetails
          ? {
              personalDetails: {
                upsert: {
                  create: {
                    fullName: personalDetails.fullName ?? "Unnamed",
                    email: personalDetails.email ?? "",
                    phone: personalDetails.phone ?? "",
                    address: personalDetails.address ?? "",
                    dateOfBirth: personalDetails.dateOfBirth
                      ? new Date(personalDetails.dateOfBirth)
                      : new Date("1970-01-01"),
                    nationalInsurance: personalDetails.nationalInsurance ?? "",
                    employmentType: personalDetails.employmentType,
                    payrollNumber: personalDetails.payrollNumber ?? "",
                  },
                  update: {
                    ...(personalDetails.fullName ? { fullName: personalDetails.fullName } : {}),
                    ...(personalDetails.email ? { email: personalDetails.email } : {}),
                    ...(personalDetails.phone ? { phone: personalDetails.phone } : {}),
                    ...(personalDetails.address ? { address: personalDetails.address } : {}),
                    ...(personalDetails.dateOfBirth
                      ? { dateOfBirth: new Date(personalDetails.dateOfBirth) }
                      : {}),
                    ...(personalDetails.nationalInsurance
                      ? { nationalInsurance: personalDetails.nationalInsurance }
                      : {}),
                    ...(personalDetails.employmentType
                      ? { employmentType: personalDetails.employmentType }
                      : {}),
                    ...(personalDetails.payrollNumber
                      ? { payrollNumber: personalDetails.payrollNumber }
                      : {}),
                  },
                },
              },
            }
          : {}),
        ...(nextOfKin
          ? {
              nextOfKin: {
                upsert: {
                  create: {
                    name: nextOfKin.name ?? "",
                    relationship: nextOfKin.relationship ?? "",
                    phone: nextOfKin.phone ?? "",
                    email: nextOfKin.email ?? null,
                    address: nextOfKin.address ?? "",
                  },
                  update: {
                    ...(nextOfKin.name ? { name: nextOfKin.name } : {}),
                    ...(nextOfKin.relationship ? { relationship: nextOfKin.relationship } : {}),
                    ...(nextOfKin.phone ? { phone: nextOfKin.phone } : {}),
                    ...(typeof nextOfKin.email !== "undefined" ? { email: nextOfKin.email ?? null } : {}),
                    ...(nextOfKin.address ? { address: nextOfKin.address } : {}),
                  },
                },
              },
            }
          : {}),
        ...(rightToWork
          ? {
              rightToWork: {
                upsert: {
                  create: {
                    country: rightToWork.country ?? "United Kingdom",
                    status: rightToWork.status ?? "NOT_PROVIDED",
                    documentUrl: rightToWork.documentUrl ?? null,
                    expiryDate: rightToWork.expiryDate ? new Date(rightToWork.expiryDate) : null,
                  },
                  update: {
                    ...(rightToWork.country ? { country: rightToWork.country } : {}),
                    ...(rightToWork.status ? { status: rightToWork.status } : {}),
                    ...(typeof rightToWork.documentUrl !== "undefined"
                      ? { documentUrl: rightToWork.documentUrl ?? null }
                      : {}),
                    ...(typeof rightToWork.expiryDate !== "undefined"
                      ? { expiryDate: rightToWork.expiryDate ? new Date(rightToWork.expiryDate) : null }
                      : {}),
                  },
                },
              },
            }
          : {}),
        ...(availability
          ? {
              availability: {
                upsert: {
                  create: {
                    mondayToFriday: !!availability.mondayToFriday,
                    saturday: !!availability.saturday,
                    sunday: !!availability.sunday,
                    nightShifts: !!availability.nightShifts,
                    unavailableDates: Array.isArray(availability.unavailableDates)
                      ? availability.unavailableDates.filter(Boolean).map((d: string) => new Date(d))
                      : [],
                  },
                  update: {
                    ...(typeof availability.mondayToFriday !== "undefined"
                      ? { mondayToFriday: !!availability.mondayToFriday }
                      : {}),
                    ...(typeof availability.saturday !== "undefined"
                      ? { saturday: !!availability.saturday }
                      : {}),
                    ...(typeof availability.sunday !== "undefined"
                      ? { sunday: !!availability.sunday }
                      : {}),
                    ...(typeof availability.nightShifts !== "undefined"
                      ? { nightShifts: !!availability.nightShifts }
                      : {}),
                    ...(Array.isArray(availability.unavailableDates)
                      ? {
                          unavailableDates: {
                            set: availability.unavailableDates
                              .filter(Boolean)
                              .map((d: string) => new Date(d)),
                          },
                        }
                      : {}),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        personalDetails: true,
        nextOfKin: true,
        rightToWork: true,
        availability: true,
        complianceCertificates: true,
        workSites: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Operative not found" }, { status: 404 })
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Unique constraint failed (email already exists)" },
          { status: 409 },
        )
      }
    }
    console.error("Error updating operative:", error)
    return NextResponse.json({ error: "Failed to update operative" }, { status: 500 })
  }
}

/**
 * DELETE /api/operatives/:id
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id // ⚠️ string UUID — do NOT cast to Number
    await prisma.operative.delete({ where: { id } })
    return NextResponse.json({ message: "Operative deleted successfully" })
  } catch (error) {
    console.error("Error deleting operative:", error)
    return NextResponse.json({ error: "Failed to delete operative" }, { status: 500 })
  }
}
