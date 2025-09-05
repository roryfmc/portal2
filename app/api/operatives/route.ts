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
    const operatives = await prisma.operative.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        personalDetails: true,
        complianceCertificates: true,
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
 *
 * Expected payload:
 * {
 *   "trade": "Carpenter",
 *   "status": "AVAILABLE", // optional
 *   "personalDetails": {
 *     "fullName": "Jane Doe",
 *     "email": "jane@example.com",
 *     "phone": "07123 456789",
 *     "address": "1 King St, London",
 *     "dateOfBirth": "1990-03-01T00:00:00.000Z",
 *     "nationalInsurance": "QQ123456C",
 *     "employmentType": "CONTRACT",
 *     "payrollNumber": "PR-0001"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trade, personalDetails, nextOfKin, rightToWork, availability } = body ?? {}
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
