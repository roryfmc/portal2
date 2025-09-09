"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  FileText,
  Upload,
  Save,
  X,
  Trash2,
  Eye,
  Pencil
} from "lucide-react"
import type { Operative } from "@/lib/types"
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib"

interface ComplianceManagementProps {
  onBack: () => void
}

type EditingCertState = {
  operativeId: string
  certId: string | number
  form: {
    name: string
    issuer: string
    issueDate: string
    expiryDate: string
    status: string
    documentUrl?: string | null
    notes?: string
  }
} | null

export function ComplianceManagement({ onBack }: ComplianceManagementProps) {
  const [operatives, setOperatives] = useState<Operative[]>([])
  const [selectedOperatives, setSelectedOperatives] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [watermarking, setWatermarking] = useState<string | null>(null)

  // NEW: which operative row is expanded to show all certificates
  const [expandedOperative, setExpandedOperative] = useState<string | null>(null)

  // NEW: inline edit state for a single certificate row
  const [editingCert, setEditingCert] = useState<EditingCertState>(null)
  const [certificateType, setCertificateType] = useState<"general" | "asbestos">("general")
  const [asbestosCertificate, setAsbestosCertificate] = useState({
    pdfFile: null as File | null,
    items: {
      asbestosTraining: {
        present: false,
        expiryDate: "",
        trainingProvider: "",
        contactInfo: "",
        certificateDetails: "",
        verifiedWith: "",
        verifiedBy: "",
        dateVerified: "",
      },
      asbestosMedical: {
        present: false,
        expiryDate: "",
        trainingProvider: "",
        contactInfo: "",
        certificateDetails: "",
        verifiedWith: "",
        verifiedBy: "",
        dateVerified: "",
      },
      fullFaceFit: {
        present: false,
        expiryDate: "",
        trainingProvider: "",
        contactInfo: "",
        certificateDetails: "",
        verifiedWith: "",
        verifiedBy: "",
        dateVerified: "",
      },
      halfFaceFit: {
        present: false,
        expiryDate: "",
        trainingProvider: "",
        contactInfo: "",
        certificateDetails: "",
        verifiedWith: "",
        verifiedBy: "",
        dateVerified: "",
      },
      maskService: {
        present: false,
        expiryDate: "",
        trainingProvider: "",
        contactInfo: "",
        certificateDetails: "",
        verifiedWith: "",
        verifiedBy: "",
        dateVerified: "",
      },
    },
  })
  const [newCertificate, setNewCertificate] = useState({
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    status: "VALID" as const,
    notes: "",
    pdfFile: null as File | null,
  })

  // Watermark a PDF file by overlaying an image and footer text on each page
  async function watermarkPDF(file: File, user: string): Promise<File> {
    const bytes = await file.arrayBuffer()
    const pdf = await PDFDocument.load(bytes)

    // Try to load a watermark image from public assets
    let imageBytes: ArrayBuffer | null = null
    const candidates = [
      "/placeholder-logo.png",
      "/recruiter-avatar.png",
      "/placeholder.jpg",
    ]
    for (const url of candidates) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          imageBytes = await res.arrayBuffer()
          break
        }
      } catch {}
    }

    const font = await pdf.embedFont(StandardFonts.Helvetica)

    let embeddedImage: any = null
    if (imageBytes) {
      try {
        embeddedImage = await pdf.embedPng(imageBytes)
      } catch {
        // ignore; leave embeddedImage null
      }
    }

    const nowText = `Checked by ${user} on ${new Date().toLocaleDateString()}`

    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      if (embeddedImage) {
        const scale = Math.min(width, height) * 0.5
        const imgW = scale
        const imgH = (embeddedImage.height / embeddedImage.width) * imgW
        page.drawImage(embeddedImage, {
          x: (width - imgW) / 2,
          y: (height - imgH) / 2,
          width: imgW,
          height: imgH,
          opacity: 0.15,
          rotate: degrees(-20),
        })
      }

      // footer text
      const textWidth = font.widthOfTextAtSize(nowText, 10)
      page.drawText(nowText, {
        x: Math.max(24, (width - textWidth) / 2),
        y: 24,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
        opacity: 0.6,
      })
    }

    const out = await pdf.save()
    return new File([out], `watermarked-${file.name}`.replace(/\s+/g, "-"), { type: "application/pdf" })
  }

  // Upload a file to the server and return a persistent URL under /uploads
  async function uploadToServer(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    if (!res.ok) {
      console.error("Upload failed", res.status)
      return null
    }
    const data = (await res.json()) as { url?: string }
    return data.url ?? null
  }

  useEffect(() => {
    let ignore = false
    const loadOperatives = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/operatives", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const all = (await res.json()) as Operative[]

        // Show all operatives; badges will indicate issues
        if (!ignore) setOperatives(all)
      } catch (e) {
        console.error(e)
        if (!ignore) setOperatives([])
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadOperatives()
    const onStorage = () => loadOperatives()
    window.addEventListener("storage", onStorage)
    return () => {
      ignore = true
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  const getExpiringCertificates = (operative: Operative) =>
    (operative.complianceCertificates || []).filter(
      (cert) => cert.status === "EXPIRING_SOON" || cert.status === "EXPIRED" || cert.status === "INVALID",
    )

  const allCertificates = (operative: Operative) => operative.complianceCertificates || []

  const handleSelectOperative = (operativeId: string, checked: boolean) => {
    const next = new Set(selectedOperatives)
    checked ? next.add(operativeId) : next.delete(operativeId)
    setSelectedOperatives(next)
  }

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) setSelectedOperatives(new Set(operatives.map((op) => op.id)))
    else setSelectedOperatives(new Set())
  }

  const refetchOperatives = async () => {
    try {
      const res = await fetch("/api/operatives", { cache: "no-store" })
      const all = res.ok ? ((await res.json()) as Operative[]) : []
      const filtered = all.filter((operative) => {
        const list = operative.complianceCertificates || []
        return list.length === 0 || list.some((cert) => cert.status === "EXPIRING_SOON" || cert.status === "EXPIRED" || cert.status === "INVALID")
      })
      setOperatives(filtered)
    } catch (e) {
      console.error(e)
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedOperatives.size === 0 || !newCertificate.name) return
    setUpdating(true)
    try {
      // Optional: watermark uploaded PDF and attach URL
      let pdfUrl: string | null = null
      if (newCertificate.pdfFile) {
        try {
          setWatermarking("Processing PDF...")
          const watermarked = await watermarkPDF(newCertificate.pdfFile, "Current User")
          pdfUrl = await uploadToServer(watermarked)
        } finally {
          setWatermarking(null)
        }
      }

      const apiCert = {
        name: newCertificate.name,
        issuer: newCertificate.issuer,
        issueDate: newCertificate.issueDate,
        expiryDate: newCertificate.expiryDate,
        status: newCertificate.status,
        documentUrl: pdfUrl,
        notes: newCertificate.notes || "",
      }

      for (const operativeId of selectedOperatives) {
        const operative = operatives.find((op) => op.id === operativeId)
        if (!operative) continue
        const existing = (operative.complianceCertificates || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          issuer: c.issuer,
          issueDate: c.issueDate,
          expiryDate: c.expiryDate,
          status: c.status,
          documentUrl: c.documentUrl ?? null,
          notes: c.notes ?? "",
        }))

        const payload = { complianceCertificates: [...existing, apiCert] }
        const res = await fetch(`/api/operatives/${operativeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) console.error(`Failed to update operative ${operativeId}: HTTP ${res.status}`)
      }

      setNewCertificate({ name: "", issuer: "", issueDate: "", expiryDate: "", status: "VALID", notes: "", pdfFile: null })
      setSelectedOperatives(new Set())
      await refetchOperatives()
      try { window.dispatchEvent(new Event("storage")) } catch {}
    } catch (error) {
      console.error("Error updating operatives:", error)
    } finally {
      setUpdating(false)
    }
  }

  // ---------- NEW: Certificate actions (View / Edit / Delete) ----------

  const toggleExpand = (operativeId: string) =>
    setExpandedOperative((curr) => (curr === operativeId ? null : operativeId))

  const viewCertificate = (cert: any) => {
    if (cert?.documentUrl) {
      window.open(cert.documentUrl, "_blank", "noopener,noreferrer")
    } else {
      alert("No document attached to this certificate.")
    }
  }

  const startEditCertificate = (operative: Operative, cert: any, idx: number) => {
    setEditingCert({
      operativeId: operative.id,
      certId: cert.id ?? idx,
      form: {
        name: cert.name || "",
        issuer: cert.issuer || "",
        issueDate: (cert.issueDate || "").slice(0, 10),
        expiryDate: (cert.expiryDate || "").slice(0, 10),
        status: cert.status || "VALID",
        documentUrl: cert.documentUrl ?? null,
        notes: cert.notes ?? "",
      },
    })
  }

  const cancelEditCertificate = () => setEditingCert(null)

  const saveEditCertificate = async () => {
    if (!editingCert) return
    const { operativeId, certId, form } = editingCert
    try {
      const operative = operatives.find((o) => o.id === operativeId)
      if (!operative) return

      const updated = (operative.complianceCertificates || []).map((c: any, idx: number) => {
        const key = c.id ?? idx
        if (key !== certId) return c
        return {
          ...c,
          name: form.name,
          issuer: form.issuer,
          issueDate: form.issueDate,
          expiryDate: form.expiryDate,
          status: form.status,
          documentUrl: form.documentUrl ?? null,
          notes: form.notes ?? "",
        }
      })

      const res = await fetch(`/api/operatives/${operativeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complianceCertificates: updated }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // update local state optimistically
      setOperatives((prev) =>
        prev.map((o) => (o.id === operativeId ? { ...o, complianceCertificates: updated } : o)),
      )
      setEditingCert(null)
      // optional: window.dispatchEvent(new Event("storage"))
    } catch (e) {
      console.error(e)
      alert("Failed to save changes.")
    }
  }

  const deleteCertificate = async (operative: Operative, cert: any, idx: number) => {
    if (!confirm(`Delete certificate "${cert.name}"?`)) return
    try {
      const remaining = (operative.complianceCertificates || []).filter((c: any, i: number) => {
        const key = c.id ?? i
        return key !== (cert.id ?? idx)
      })

      const res = await fetch(`/api/operatives/${operative.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complianceCertificates: remaining }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setOperatives((prev) =>
        prev.map((o) => (o.id === operative.id ? { ...o, complianceCertificates: remaining } : o)),
      )
      if (editingCert && editingCert.operativeId === operative.id && (editingCert.certId === (cert.id ?? idx))) {
        setEditingCert(null)
      }
    } catch (e) {
      console.error(e)
      alert("Failed to delete certificate.")
    }
  }

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—")
  const updateAsbestosItem = (itemKey: string, field: string, value: any) => {
    setAsbestosCertificate((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [itemKey]: {
          ...prev.items[itemKey as keyof typeof prev.items],
          [field]: value,
        },
      },
    }))
  }

  const handleAsbestosBulkUpdate = async () => {
    if (selectedOperatives.size === 0 || !asbestosCertificate.pdfFile) return

    setUpdating(true)
    try {
      let pdfUrl: string | null = null

      // Handle PDF watermarking
      setWatermarking("Processing PDF...")
      const watermarkedFile = await watermarkPDF(asbestosCertificate.pdfFile, "Current User")
      pdfUrl = await uploadToServer(watermarkedFile)
      setWatermarking(null)

      // Create certificates for each checked item
      const certificates: any[] = []

      Object.entries(asbestosCertificate.items).forEach(([key, item]) => {
        if (item.present && item.expiryDate) {
          const certName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
          certificates.push({
            id: `cert-${Date.now()}-${key}`,
            name: `Asbestos - ${certName}`,
            issuer: item.trainingProvider || "Unknown",
            issueDate: new Date().toISOString().split("T")[0],
            expiryDate: item.expiryDate,
            status: "VALID",
            notes: `Training Provider: ${item.trainingProvider}\nContact: ${item.contactInfo}\nDetails: ${item.certificateDetails}\nVerified With: ${item.verifiedWith}\nVerified By: ${item.verifiedBy}\nDate Verified: ${item.dateVerified}`,
            documentUrl: pdfUrl || null,
          })
        }
      })

      // Update each selected operative via API
      for (const operativeId of selectedOperatives) {
        const operative = operatives.find((op) => op.id === operativeId)
        if (!operative) continue
        const existing = (operative.complianceCertificates || []).map((c: any) => ({
          name: c.name,
          issuer: c.issuer,
          issueDate: c.issueDate,
          expiryDate: c.expiryDate,
          status: c.status,
          documentUrl: c.documentUrl ?? null,
        }))
        const payload = { complianceCertificates: [...existing, ...certificates] }
        const res = await fetch(`/api/operatives/${operativeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) console.error(`Failed to update operative ${operativeId}: HTTP ${res.status}`)
      }

      // Reset form and selections
      setAsbestosCertificate({
        pdfFile: null,
        items: {
          asbestosTraining: {
            present: false,
            expiryDate: "",
            trainingProvider: "",
            contactInfo: "",
            certificateDetails: "",
            verifiedWith: "",
            verifiedBy: "",
            dateVerified: "",
          },
          asbestosMedical: {
            present: false,
            expiryDate: "",
            trainingProvider: "",
            contactInfo: "",
            certificateDetails: "",
            verifiedWith: "",
            verifiedBy: "",
            dateVerified: "",
          },
          fullFaceFit: {
            present: false,
            expiryDate: "",
            trainingProvider: "",
            contactInfo: "",
            certificateDetails: "",
            verifiedWith: "",
            verifiedBy: "",
            dateVerified: "",
          },
          halfFaceFit: {
            present: false,
            expiryDate: "",
            trainingProvider: "",
            contactInfo: "",
            certificateDetails: "",
            verifiedWith: "",
            verifiedBy: "",
            dateVerified: "",
          },
          maskService: {
            present: false,
            expiryDate: "",
            trainingProvider: "",
            contactInfo: "",
            certificateDetails: "",
            verifiedWith: "",
            verifiedBy: "",
            dateVerified: "",
          },
        },
      })
      setSelectedOperatives(new Set())

      // Reload operatives
      await refetchOperatives()
      try { window.dispatchEvent(new Event("storage")) } catch {}
    } catch (error) {
      console.error("Error updating operatives:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      if (certificateType === "general") {
        setNewCertificate((prev) => ({ ...prev, pdfFile: file }))
      } else {
        setAsbestosCertificate((prev) => ({ ...prev, pdfFile: file }))
      }
    }
  }

  // --------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading compliance data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compliance Management</h1>
          <p className="text-muted-foreground mt-1">Manage expiring certifications and bulk updates</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operatives.length}</p>
                <p className="text-sm text-muted-foreground">Operatives Need Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {operatives.reduce(
                    (total, op) =>
                      total + (op.complianceCertificates || []).filter((cert) => cert.status === "EXPIRED" || cert.status === "INVALID").length,
                    0,
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Expired Certificates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {operatives.reduce(
                    (total, op) =>
                      total + (op.complianceCertificates || []).filter((cert) => cert.status === "EXPIRING_SOON").length,
                    0,
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Update Form */}
      {selectedOperatives.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Add Certificate to {selectedOperatives.size} Selected Operative{selectedOperatives.size > 1 ? "s" : ""}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={certificateType === "general" ? "default" : "outline"}
                size="sm"
                onClick={() => setCertificateType("general")}
              >
                General Certificate
              </Button>
              <Button
                variant={certificateType === "asbestos" ? "default" : "outline"}
                size="sm"
                onClick={() => setCertificateType("asbestos")}
              >
                Asbestos Certificate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {certificateType === "general" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="cert-name">Certificate Name</Label>
                    <Input
                    id="cert-name"
                    value={newCertificate.name}
                    onChange={(e) => setNewCertificate((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., CSCS Card, First Aid"
                    />
                </div>
                <div>
                    <Label htmlFor="cert-issuer">Issuer</Label>
                    <Input
                    id="cert-issuer"
                    value={newCertificate.issuer}
                    onChange={(e) => setNewCertificate((prev) => ({ ...prev, issuer: e.target.value }))}
                    placeholder="e.g., CITB, Red Cross"
                    />
                </div>
                <div>
                    <Label htmlFor="cert-issue">Issue Date</Label>
                    <Input
                    id="cert-issue"
                    type="date"
                    value={newCertificate.issueDate}
                    onChange={(e) => setNewCertificate((prev) => ({ ...prev, issueDate: e.target.value }))}
                    />
                </div>
                <div>
                    <Label htmlFor="cert-expiry">Expiry Date</Label>
                    <Input
                    id="cert-expiry"
                    type="date"
                    value={newCertificate.expiryDate}
                    onChange={(e) => setNewCertificate((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    />
                </div>
                </div>

                <div>
                  <Label htmlFor="cert-notes">Notes (Optional)</Label>
                  <Textarea
                    id="cert-notes"
                    value={newCertificate.notes}
                    onChange={(e) => setNewCertificate((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this certificate..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="cert-pdf">Certificate PDF (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input id="cert-pdf" type="file" accept=".pdf" onChange={handleFileUpload} className="flex-1" />
                    {newCertificate.pdfFile && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {newCertificate.pdfFile.name}
                      </Badge>
                    )}
                  </div>
                  {newCertificate.pdfFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF will be automatically watermarked before saving
                    </p>
                  )}
                </div>
                {watermarking && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Upload className="w-4 h-4 animate-spin" />
                    {watermarking}
                  </div>
                )}
                <div className="flex gap-2">
                <Button onClick={handleBulkUpdate} disabled={!newCertificate.name || updating || !!watermarking} className="bg-primary hover:bg-primary/90">
                    <Save className="w-4 h-4 mr-2" />
                    {updating ? "Updating..." : "Add Certificate"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedOperatives(new Set())}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
                </div>
            </>
            ) : (
              <>
                <div>
                  <Label htmlFor="asbestos-pdf">Asbestos Certificate PDF (Required)</Label>
                  <div className="flex items-center gap-2">
                    <Input id="asbestos-pdf" type="file" accept=".pdf" onChange={handleFileUpload} className="flex-1" />
                    {asbestosCertificate.pdfFile && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {asbestosCertificate.pdfFile.name}
                      </Badge>
                    )}
                  </div>
                  {asbestosCertificate.pdfFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF will be automatically watermarked with "Checked by user" before saving
                    </p>
                  )}
                </div>

                <div className="space-y-6">
                  <h4 className="font-semibold">Asbestos Certificate Items</h4>

                  {Object.entries(asbestosCertificate.items).map(([key, item]) => {
                    const displayName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())

                    return (
                      <div key={key} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={item.present}
                            onCheckedChange={(checked) => updateAsbestosItem(key, "present", checked)}
                          />
                          <Label className="font-medium">{displayName}</Label>
                          {item.present && (
                            <Badge variant="secondary" className="text-xs">
                              Present in PDF
                            </Badge>
                          )}
                        </div>

                        {item.present && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                            <div>
                              <Label className="text-xs">Expiry Date</Label>
                              <Input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) => updateAsbestosItem(key, "expiryDate", e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Training Provider</Label>
                              <Input
                                value={item.trainingProvider}
                                onChange={(e) => updateAsbestosItem(key, "trainingProvider", e.target.value)}
                                placeholder="Provider name"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Contact Information</Label>
                              <Input
                                value={item.contactInfo}
                                onChange={(e) => updateAsbestosItem(key, "contactInfo", e.target.value)}
                                placeholder="Phone/Email"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Certificate Details</Label>
                              <Input
                                value={item.certificateDetails}
                                onChange={(e) => updateAsbestosItem(key, "certificateDetails", e.target.value)}
                                placeholder="Certificate number/details"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Verified With</Label>
                              <Input
                                value={item.verifiedWith}
                                onChange={(e) => updateAsbestosItem(key, "verifiedWith", e.target.value)}
                                placeholder="Organization/Person"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Verified By</Label>
                              <Input
                                value={item.verifiedBy}
                                onChange={(e) => updateAsbestosItem(key, "verifiedBy", e.target.value)}
                                placeholder="Verifier name"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Date Verified</Label>
                              <Input
                                type="date"
                                value={item.dateVerified}
                                onChange={(e) => updateAsbestosItem(key, "dateVerified", e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {watermarking && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Upload className="w-4 h-4 animate-spin" />
                    {watermarking}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleAsbestosBulkUpdate}
                    disabled={
                      !asbestosCertificate.pdfFile ||
                      updating ||
                      !!watermarking ||
                      !Object.values(asbestosCertificate.items).some((item) => item.present)
                    }
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updating ? "Updating..." : watermarking ? "Processing..." : "Add Asbestos Certificates"}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedOperatives(new Set())}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operatives List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Operatives Compliance Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {operatives.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Compliance Up to Date!</h3>
              <p className="text-muted-foreground">No operatives have expiring or expired certificates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operatives.map((operative) => {
                const expiringCerts = getExpiringCertificates(operative)
                const isExpanded = expandedOperative === operative.id
                const REQUIRED = ["Training", "Medical", "Full Face Fit", "Half Face Fit", "Mask Service"]
                const list: any[] = (operative.complianceCertificates as any) || []
                const msDay = 24 * 60 * 60 * 1000
                const now = new Date(); now.setHours(0,0,0,0)
                const findCert = (t: string) => list.find((c: any) => (c?.certType ? c.certType === "ASBESTOS" : true) && String(c.name || "").toLowerCase() === t.toLowerCase())
                const missing = REQUIRED.filter((t) => !findCert(t))
                const expiringAsbestos = REQUIRED.map((t) => {
                  const c = findCert(t)
                  if (!c || !c.expiryDate) return null
                  const exp = new Date(c.expiryDate); exp.setHours(0,0,0,0)
                  const days = Math.floor((exp.getTime() - now.getTime())/msDay)
                  return { t, days }
                }).filter((x: any) => x && (x.days <= 42)) as {t:string;days:number}[]

                return (
                  <div
                    key={operative.id}
                    className="border rounded-lg p-4 hover:bg-accent/30 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => window.dispatchEvent(new CustomEvent("openOperative", { detail: operative }))}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && window.dispatchEvent(new CustomEvent("openOperative", { detail: operative }))}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-1"
                      >
                        <Checkbox
                          checked={selectedOperatives.has(operative.id)}
                          onCheckedChange={(checked) => handleSelectOperative(operative.id, !!checked)}
                        />
                      </div>

                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold">
                          {getInitials(operative.personalDetails?.fullName || "Unknown")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{operative.personalDetails?.fullName || "Unnamed"}</h3>
                          <Badge variant="outline" className="text-xs">
                            {operative.personalDetails?.payrollNumber || ""}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {operative.personalDetails.email} • {operative.personalDetails.phone}
                          </p>

                          <div className="space-y-1">
                            {(missing.length > 0 || expiringAsbestos.length > 0 || expiringCerts.length > 0) && (
                              <p className="text-sm font-medium text-red-600">Compliance Alerts</p>
                            )}
                            {missing.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {missing.map((m) => (
                                  <Badge key={`miss-${operative.id}-${m}`} variant="destructive" className="text-[10px]">
                                    Missing: {m}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {expiringAsbestos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {expiringAsbestos.map((e) => (
                                  <Badge key={`expasb-${operative.id}-${e.t}`} variant="secondary" className={`text-[10px] ${e.days <= 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-700'}`}>
                                    {e.days <= 0 ? 'Expired' : 'Expiring'}: {e.t}{e.days > 0 ? ` (${e.days}d)` : ''}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {expiringCerts.length > 0 && (
                              <div className="flex flex-col gap-1">
                                {expiringCerts.map((cert) => (
                                  <div key={cert.id ?? cert.name} className="flex items-center gap-2 text-sm">
                                    <Badge
                                      variant={cert.status === "EXPIRED" || cert.status === "INVALID" ? "destructive" : "secondary"}
                                      className="text-[10px]"
                                    >
                                      {cert.status === "EXPIRING_SOON" ? "Expiring Soon" : cert.status}
                                    </Badge>
                                    <span className="text-xs">{cert.name}</span>
                                    <span className="text-xs text-muted-foreground">(Expires: {fmt(cert.expiryDate)})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: ALL certificates with actions */}
                    {isExpanded && (
                      <div className="mt-4 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                        <h4 className="font-semibold mb-2">All Certificates</h4>
                        {allCertificates(operative).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No certificates recorded.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-2 pr-3">Name</th>
                                  <th className="py-2 pr-3">Issuer</th>
                                  <th className="py-2 pr-3">Issue Date</th>
                                  <th className="py-2 pr-3">Expiry Date</th>
                                  <th className="py-2 pr-3">Status</th>
                                  <th className="py-2 pr-3">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allCertificates(operative).map((cert, idx) => {
                                  const key = cert.id ?? idx
                                  const isEditing =
                                    editingCert &&
                                    editingCert.operativeId === operative.id &&
                                    editingCert.certId === key

                                  return (
                                    <tr key={key} className="border-t">
                                      <td className="py-2 pr-3">
                                        {isEditing ? (
                                          <Input
                                            value={editingCert!.form.name}
                                            onChange={(e) =>
                                              setEditingCert((prev) =>
                                                prev ? { ...prev, form: { ...prev.form, name: e.target.value } } : prev,
                                              )
                                            }
                                          />
                                        ) : (
                                          cert.name || "—"
                                        )}
                                      </td>
                                      <td className="py-2 pr-3">
                                        {isEditing ? (
                                          <Input
                                            value={editingCert!.form.issuer}
                                            onChange={(e) =>
                                              setEditingCert((prev) =>
                                                prev ? { ...prev, form: { ...prev.form, issuer: e.target.value } } : prev,
                                              )
                                            }
                                          />
                                        ) : (
                                          cert.issuer || "—"
                                        )}
                                      </td>
                                      <td className="py-2 pr-3">
                                        {isEditing ? (
                                          <Input
                                            type="date"
                                            value={editingCert!.form.issueDate || ""}
                                            onChange={(e) =>
                                              setEditingCert((prev) =>
                                                prev ? { ...prev, form: { ...prev.form, issueDate: e.target.value } } : prev,
                                              )
                                            }
                                          />
                                        ) : (
                                          fmt(cert.issueDate)
                                        )}
                                      </td>
                                      <td className="py-2 pr-3">
                                        {isEditing ? (
                                          <Input
                                            type="date"
                                            value={editingCert!.form.expiryDate || ""}
                                            onChange={(e) =>
                                              setEditingCert((prev) =>
                                                prev ? { ...prev, form: { ...prev.form, expiryDate: e.target.value } } : prev,
                                              )
                                            }
                                          />
                                        ) : (
                                          fmt(cert.expiryDate)
                                        )}
                                      </td>
                                      <td className="py-2 pr-3">
                                        {isEditing ? (
                                          <Input
                                            value={editingCert!.form.status}
                                            onChange={(e) =>
                                              setEditingCert((prev) =>
                                                prev ? { ...prev, form: { ...prev.form, status: e.target.value } } : prev,
                                              )
                                            }
                                          />
                                        ) : (
                                          <Badge
                                            variant={
                                              cert.status === "EXPIRED" || cert.status === "INVALID"
                                                ? "destructive"
                                                : cert.status === "EXPIRING_SOON"
                                                ? "secondary"
                                                : "outline"
                                            }
                                          >
                                            {cert.status}
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="py-2 pr-3">
                                        {isEditing ? (
                                          <div className="flex items-center gap-2">
                                            <Button size="sm" onClick={saveEditCertificate}>
                                              <Save className="w-4 h-4 mr-1" /> Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={cancelEditCertificate}>
                                              <X className="w-4 h-4 mr-1" /> Cancel
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => viewCertificate(cert)}
                                              title="View document"
                                            >
                                              <Eye className="w-4 h-4 mr-1" /> View
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => startEditCertificate(operative, cert, idx)}
                                              title="Edit certificate"
                                            >
                                              <Pencil className="w-4 h-4 mr-1" /> Edit
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => deleteCertificate(operative, cert, idx)}
                                              title="Delete certificate"
                                            >
                                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                                            </Button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
