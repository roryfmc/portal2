// app/api/operatives/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/operatives
 * Returns operatives with the relations the UI expects.
 */
export async function GET() {
  try {
    // Normalize expired certificates to INVALID on each fetch
    try {
      const now = new Date(); now.setHours(0,0,0,0)
      await prisma.complianceCertificate.updateMany({
        where: { expiryDate: { lte: now } },
        data: { status: "INVALID" as any },
      })
    } catch {}

    const operatives = await prisma.operative.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        personalDetails: true,
        complianceCertificates: true,
        unableToWorkWith: true,
        workSites: true,
        nextOfKin: true,
        rightToWork: true,
        availability: true,
        siteAssignments: true,
        siteLinks: true,
      },
    })
    return NextResponse.json(operatives)
  } catch (error) {
    console.error("Error fetching operatives:", error)
    return NextResponse.json({ error: "Failed to fetch operatives" }, { status: 500 })
  }
}

/**
 * POST /api/operatives
 * Create an operative + nested personalDetails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trade, personalDetails, nextOfKin, rightToWork, availability, complianceCertificates, unableToWorkWith } = body ?? {}

    if (!personalDetails?.fullName || !personalDetails?.email) {
      return NextResponse.json(
        { error: "Missing required fields: personalDetails.fullName and personalDetails.email" },
        { status: 400 },
      )
    }

    const operative = await prisma.operative.create({
      data: {
        ...(trade ? { trade } : {}),

        ...(personalDetails && personalDetails.fullName && personalDetails.email
          ? {
              personalDetails: {
                create: {
                  fullName: personalDetails.fullName,
                  email: personalDetails.email,
                  phone: personalDetails.phone ?? "",
                  address: personalDetails.address ?? "",
                  dateOfBirth: personalDetails.dateOfBirth
                    ? new Date(personalDetails.dateOfBirth)
                    : new Date("1970-01-01"),
                  nationalInsurance: personalDetails.nationalInsurance ?? "",
                  employmentType: personalDetails.employmentType,
                  payrollNumber: personalDetails.payrollNumber ?? "",
                },
              },
            }
          : {}),

        ...(nextOfKin && nextOfKin.name
          ? {
              nextOfKin: {
                create: {
                  name: nextOfKin.name,
                  relationship: nextOfKin.relationship ?? "",
                  phone: nextOfKin.phone ?? "",
                  email: nextOfKin.email ?? null,
                  address: nextOfKin.address ?? "",
                },
              },
            }
          : {}),

        ...(rightToWork
          ? {
              rightToWork: {
                create: {
                  country: rightToWork.country ?? "United Kingdom",
                  status: rightToWork.status ?? "NOT_PROVIDED",
                  documentUrl: rightToWork.documentUrl ?? null,
                  expiryDate: rightToWork.expiryDate ? new Date(rightToWork.expiryDate) : null,
                },
              },
            }
          : {}),

        ...(availability
          ? {
              availability: {
                create: {
                  mondayToFriday: !!availability.mondayToFriday,
                  saturday: !!availability.saturday,
                  sunday: !!availability.sunday,
                  nightShifts: !!availability.nightShifts,
                  unavailableDates: Array.isArray(availability.unavailableDates)
                    ? availability.unavailableDates.filter(Boolean).map((d: string) => new Date(d))
                    : [],
                },
              },
            }
          : {}),

        ...(Array.isArray(complianceCertificates) && complianceCertificates.length
          ? {
              complianceCertificates: {
                create: complianceCertificates
                  .filter((c: any) => c?.name)
                  .map((c: any) => {
                    const exp = c.expiryDate ? new Date(c.expiryDate) : null
                    const now = new Date()
                    now.setHours(0, 0, 0, 0)
                    if (exp) exp.setHours(0, 0, 0, 0)

                    const isInvalid =
                      !!exp && !isNaN(exp.getTime()) && exp.getTime() <= now.getTime()
                    const computedStatus = isInvalid ? "INVALID" : (c.status ?? null)

                    return {
                      name: String(c.name),
                      expiryDate: c.expiryDate ? new Date(c.expiryDate) : new Date(),
                      documentUrl: c.documentUrl ?? null,
                      trainingProvider: c.trainingProvider ?? null,
                      contact: c.contact ?? null,
                      certificateDetails: c.certificateDetails ?? null,
                      verifiedWith: c.verifiedWith ?? null,
                      verifiedBy: c.verifiedBy ?? null,
                      dateVerified: c.dateVerified ? new Date(c.dateVerified) : null,
                      // back-compat
                      issuer: c.issuer ?? c.trainingProvider ?? null,
                      issueDate: c.issueDate ? new Date(c.issueDate) : null,
                      status: computedStatus as any,
                      notes: typeof c.notes === "string" ? c.notes : null,
                      certType: (c.certType === "ASBESTOS" ? "ASBESTOS" : "GENERAL") as any,
                    }
                  }),
              },
            }
          : {}),
        ...(Array.isArray(unableToWorkWith) && unableToWorkWith.length
          ? {
              unableToWorkWith: {
                create: unableToWorkWith
                  .filter((u: any) => u && (u.type || u.targetType))
                  .map((u: any) => ({
                    targetType: (u.type || u.targetType) === "client" || (u.type || u.targetType) === "CLIENT" ? "CLIENT" : "OPERATIVE",
                    targetOperativeId:
                      (u.type || u.targetType) === "operative" || (u.type || u.targetType) === "OPERATIVE"
                        ? String(u.id || u.targetOperativeId)
                        : null,
                    targetClientId:
                      (u.type || u.targetType) === "client" || (u.type || u.targetType) === "CLIENT"
                        ? Number(u.id || u.targetClientId)
                        : null,
                    note: typeof u.note === "string" ? u.note : null,
                  })),
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
        unableToWorkWith: true,
        workSites: true,
      },
    })

    return NextResponse.json(operative, { status: 201 })
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Unique constraint failed (email already exists)" },
          { status: 409 },
        )
      }
    }
    console.error("Error creating operative:", error)
    return NextResponse.json({ error: "Failed to create operative" }, { status: 500 })
  }
}
