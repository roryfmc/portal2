// app/api/uploads/route.ts
import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const blob = form.get("file") as File | null
    if (!blob) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    // Restrict to PDFs for now
    const mime = blob.type || "application/octet-stream"
    if (mime !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }

    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    try {
      await fs.mkdir(uploadsDir, { recursive: true })
    } catch {}

    const safeBase = (blob.name || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_")
    const stamped = `${Date.now()}-${safeBase}`
    const filePath = path.join(uploadsDir, stamped)

    await fs.writeFile(filePath, buffer)

    // Public URL served by Next from /public
    const url = `/uploads/${stamped}`
    return NextResponse.json({ url })
  } catch (e) {
    console.error("Upload error:", e)
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 })
  }
}

