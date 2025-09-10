"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  User,
  Users,
  FileText,
  Building,
  Shield,
  Calendar,
  Edit,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Save,
  Upload,
  Trash2,
  ShieldAlert,
} from "lucide-react"
import type { Operative } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib"

interface OperativeCardProps {
  operative: Operative
  onEdit: () => void
  onBack: () => void
}

export function OperativeCard({ operative, onEdit, onBack }: OperativeCardProps) {
  const [activeTab, setActiveTab] = useState("personal")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeployedNow, setIsDeployedNow] = useState(false)
  const [uwOperativeNames, setUwOperativeNames] = useState<Record<string, string>>({})
  const [uwClientNames, setUwClientNames] = useState<Record<number, string>>({} as any)
  const [currentAssignments, setCurrentAssignments] = useState<
    Array<{ siteName: string; startDate: string; endDate: string }>
  >([])
  const [watermarking, setWatermarking] = useState<string | null>(null)
  const [savingCert, setSavingCert] = useState(false)

  // Local certs state so we can reflect updates immediately
  const [certs, setCerts] = useState(operative.complianceCertificates ?? [])
  useEffect(() => {
    setCerts(operative.complianceCertificates ?? [])
  }, [operative.complianceCertificates])

  // Add-certificate form state
  const [certType, setCertType] = useState<"general" | "asbestos">("general")
  const [newCert, setNewCert] = useState({
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    status: "VALID" as const,
    notes: "",
    pdfFile: null as File | null,
    // Asbestos-specific extras
    trainingProvider: "",
    contactInfo: "",
    certificateDetails: "",
    verifiedWith: "",
    verifiedBy: "",
    dateVerified: "",
  })

  // Compute real-time deployment status based on current assignments
  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await fetch("/api/assignments", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const now = new Date()
        // Compare on date-only boundaries to avoid time-of-day off-by-one issues
        const isDateInRange = (date: Date, start: Date, end: Date) => {
          const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
          const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
          return d >= s && d <= e
        }
        const current = (data as any[])
          .filter(
            (a) =>
              String(a.operativeId) === String(operative.id) &&
              isDateInRange(now, new Date(a.startDate), new Date(a.endDate)),
          )
          .map((a) => ({
            siteName: (a as any)?.site?.name || "Unknown site",
            startDate: String(a.startDate),
            endDate: String(a.endDate),
          }))
        if (!ignore) {
          setIsDeployedNow(current.length > 0)
          setCurrentAssignments(current)
        }
      } catch {}
    }
    load()
    return () => {
      ignore = true
    }
  }, [operative.id])

  // Load names for "Unable To Work With" targets
  useEffect(() => {
    const list: any[] = (operative as any)?.unableToWorkWith || []
    if (!list.length) return
    let ignore = false
    const load = async () => {
      try {
        const [opsRes, clientsRes] = await Promise.all([
          fetch("/api/operatives", { cache: "no-store" }),
          fetch("/api/clients", { cache: "no-store" }).catch(() => null),
        ])
        if (!ignore && opsRes?.ok) {
          const ops = await opsRes.json()
          const map: Record<string, string> = {}
          ;(ops || []).forEach((o: any) => {
            map[String(o.id)] = o?.personalDetails?.fullName || "Unnamed"
          })
          setUwOperativeNames(map)
        }
        if (!ignore && clientsRes && clientsRes.ok) {
          const cls = await clientsRes.json()
          const cmap: Record<number, string> = {} as any
          ;(cls || []).forEach((c: any) => {
            cmap[Number(c.id)] = c?.name || "Unknown client"
          })
          setUwClientNames(cmap)
        }
      } catch {}
    }
    load()
    return () => {
      ignore = true
    }
  }, [operative.unableToWorkWith])

  const getInitials = (name?: string) =>
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  // Map schema enum to UI color/icon
  // CertificateStatus: "VALID" | "EXPIRING_SOON" | "EXPIRED" | "INVALID"
  const getComplianceStatus = (certificate: { status?: string }) => {
    switch (certificate.status) {
      case "VALID":
        return { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", badgeVariant: "default" as const }
      case "EXPIRING_SOON":
        return { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100", badgeVariant: "secondary" as const }
      case "INVALID":
        return { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", badgeVariant: "secondary" as const }
      case "EXPIRED":
        return { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", badgeVariant: "secondary" as const }
      default:
        return { icon: Clock, color: "text-gray-600", bg: "bg-gray-100", badgeVariant: "secondary" as const }
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—"
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  // Watermark file helper (same approach as compliance-management)
  async function watermarkPDF(file: File, user: string): Promise<File> {
    const bytes = await file.arrayBuffer()
    const pdf = await PDFDocument.load(bytes)
    let imageBytes: ArrayBuffer | null = null
    const candidates = ["/placeholder-logo.png", "/recruiter-avatar.png", "/placeholder.jpg"]
    for (const url of candidates) {
      try {
        const res = await fetch(url)
        if (res.ok) { imageBytes = await res.arrayBuffer(); break }
      } catch {}
    }
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    let embeddedImage: any = null
    if (imageBytes) {
      try { embeddedImage = await pdf.embedPng(imageBytes) } catch {}
    }
    const nowText = `Checked by ${user} on ${new Date().toLocaleDateString()}`
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      if (embeddedImage) {
        const imgW = Math.min(width, height) * 0.5
        const imgH = (embeddedImage.height / embeddedImage.width) * imgW
        page.drawImage(embeddedImage, { x: (width - imgW)/2, y: (height - imgH)/2, width: imgW, height: imgH, opacity: 0.15, rotate: degrees(-20) })
      }
      const tw = font.widthOfTextAtSize(nowText, 10)
      page.drawText(nowText, { x: Math.max(24, (width - tw)/2), y: 24, size: 10, font, color: rgb(0.2,0.2,0.2), opacity: 0.6 })
    }
    const out = await pdf.save()
    return new File([out], `watermarked-${file.name}`.replace(/\s+/g, "-"), { type: "application/pdf" })
  }

  async function uploadToServer(file: File): Promise<string | null> {
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  }

  async function handleAddCertificate() {
    if (!newCert.name) { toast({ title: "Certificate name required" }); return }
    if (certType === "asbestos") {
      if (!newCert.pdfFile) { toast({ title: "PDF required for Asbestos" }); return }
      if (!newCert.expiryDate) { toast({ title: "Expiry date is required for Asbestos" }); return }
    }
    setSavingCert(true)
    try {
      let docUrl: string | null = null
      if (newCert.pdfFile) {
        try {
          setWatermarking("Processing PDF...")
          const wm = await watermarkPDF(newCert.pdfFile, "Current User")
          docUrl = await uploadToServer(wm)
        } finally { setWatermarking(null) }
      }
      const name = certType === "asbestos" && !/^Asbestos\s*-/.test(newCert.name)
        ? `Asbestos - ${newCert.name}`
        : newCert.name
      // Build notes if asbestos extras provided
      const asbestosNotes = certType === "asbestos"
        ? [
            newCert.trainingProvider ? `Training Provider: ${newCert.trainingProvider}` : "",
            newCert.contactInfo ? `Contact: ${newCert.contactInfo}` : "",
            newCert.certificateDetails ? `Details: ${newCert.certificateDetails}` : "",
            newCert.verifiedWith ? `Verified With: ${newCert.verifiedWith}` : "",
            newCert.verifiedBy ? `Verified By: ${newCert.verifiedBy}` : "",
            newCert.dateVerified ? `Date Verified: ${newCert.dateVerified}` : "",
          ].filter(Boolean).join("\n")
        : ""

      const getSessionId = () => {
        try {
          const k = "portal_session_id"
          let v = window.localStorage.getItem(k)
          if (!v) { v = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; window.localStorage.setItem(k, v) }
          return v
        } catch { return "anonymous" }
      }
      const toAdd = {
        name,
        expiryDate: newCert.expiryDate,
        documentUrl: docUrl,
        trainingProvider: certType === "asbestos" ? (newCert.trainingProvider || newCert.issuer) : (newCert.issuer || ""),
        contact: newCert.contactInfo || "",
        certificateDetails: newCert.certificateDetails || "",
        verifiedWith: newCert.verifiedWith || "",
        verifiedBy: newCert.verifiedBy || getSessionId(),
        dateVerified: new Date().toISOString(),
        // legacy/back-compat
        issuer: certType === "asbestos" ? (newCert.trainingProvider || newCert.issuer) : newCert.issuer,
        issueDate: newCert.issueDate || new Date().toISOString().slice(0,10),
        status: newCert.status,
        notes: (newCert.notes || asbestosNotes) || "",
        certType: (certType === "asbestos" ? "ASBESTOS" : "GENERAL") as const,
      }
      const payload = { complianceCertificates: [...(certs || []), toAdd] }
      const res = await fetch(`/api/operatives/${operative.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json()
      setCerts(updated?.complianceCertificates || payload.complianceCertificates)
      setNewCert({
        name: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        status: "VALID",
        notes: "",
        pdfFile: null,
        trainingProvider: "",
        contactInfo: "",
        certificateDetails: "",
        verifiedWith: "",
        verifiedBy: "",
        dateVerified: "",
      })
      try { window.dispatchEvent(new Event("storage")) } catch {}
      toast({ title: "Certificate added" })
    } catch (e: any) {
      console.error(e)
      toast({ title: "Failed to add certificate", description: e?.message || "Unknown error" })
    } finally { setSavingCert(false) }
  }

  const handleDocumentDownload = (url?: string | null, filename?: string) => {
    if (!url) return
    const link = document.createElement("a")
    link.href = url
    link.download = filename || "document"
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const pd = operative.personalDetails
  const rtw = operative.rightToWork
  const nok = operative.nextOfKin
  const avail = operative.availability
  // const certs = operative.complianceCertificates ?? []
  const sites = operative.workSites ?? []
  const timeOff = (operative as any).timeOffRequests ?? [] // if your lib/types includes it, this will be typed

  const rightToWorkVerified = rtw?.status === "VERIFIED"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-primary hover:text-primary/80">
          ← Back to Operatives
        </Button>
        <Button onClick={onEdit} className="bg-primary hover:bg-primary/90">
          <Edit className="w-4 h-4 mr-2" />
          Edit Operative
        </Button>
      </div>

      {/* Operative Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {getInitials(pd?.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{pd?.fullName ?? "Unnamed operative"}</h1>
                <Badge variant="outline" className="text-sm">
                  {pd?.payrollNumber ?? "—"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={isDeployedNow ? "destructive" : "default"} className="text-sm">
                  {isDeployedNow ? "Deployed" : "Available"}
                </Badge>
                {isDeployedNow && currentAssignments.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {currentAssignments.length === 1 ? (
                      <>
                        to {currentAssignments[0].siteName} 
                        • {formatDate(currentAssignments[0].startDate)} – {formatDate(currentAssignments[0].endDate)}
                      </>
                    ) : (
                      <>
                        to {currentAssignments.map((a) => a.siteName).join(", ")} 
                        • multiple assignments
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{pd?.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{pd?.phone ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">
                    {pd?.employmentType ? pd.employmentType.toLowerCase() : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {rightToWorkVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                )}
                <span className="text-sm font-medium">{rtw?.status ?? "NOT_PROVIDED"}</span>
              </div>
              <p className="text-xs text-muted-foreground">Right to Work</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-7">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="nextofkin" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Next of Kin</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="sites" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span className="hidden sm:inline">Work Sites</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Availability</span>
          </TabsTrigger>
          <TabsTrigger value="unable" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Unable To Work With</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Details Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-lg font-medium">{pd?.fullName ?? "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <p className="text-lg">{pd?.email ?? "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                    <p className="text-lg">{pd?.phone ?? "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-lg">{formatDate(pd?.dateOfBirth)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-lg">{pd?.address ?? "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">National Insurance</label>
                    <p className="text-lg font-mono">{pd?.nationalInsurance ?? "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                    <p className="text-lg capitalize">{pd?.employmentType?.toLowerCase() ?? "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payroll Number</label>
                    <p className="text-lg font-mono">{pd?.payrollNumber ?? "—"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Next of Kin Tab */}
        <TabsContent value="nextofkin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {nok ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                        <p className="text-lg font-medium">{nok.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                        <p className="text-lg capitalize">{nok.relationship}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                        <p className="text-lg">{nok.phone}</p>
                      </div>
                      {nok.email && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                          <p className="text-lg">{nok.email}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-lg">{nok.address}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No next of kin recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents / Right to Work Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Right to Work Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {rtw ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Country</label>
                      <p className="text-lg font-medium">{rtw.country}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        {rtw.status === "VERIFIED" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        )}
                        <Badge
                          variant={rtw.status === "VERIFIED" ? "default" : "secondary"}
                          className={rtw.status === "VERIFIED" ? "bg-green-100 text-green-800" : ""}
                        >
                          {rtw.status}
                        </Badge>
                      </div>
                    </div>
                    {rtw.expiryDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                        <p className="text-lg">{formatDate(rtw.expiryDate)}</p>
                      </div>
                    )}
                  </div>

                  {rtw.documentUrl ? (
                    <div className="border-2 border-dashed border-green-200 bg-green-50 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">Right to Work Document</p>
                            <p className="text-sm text-green-700">Document uploaded and available</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDocumentDownload(rtw.documentUrl, "right-to-work-document")}
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No document uploaded</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No right to work record</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Sites Tab */}
        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Previous Work Sites
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sites.length > 0 ? (
                <div className="space-y-4">
                  {sites.map((site) => (
                    <div key={site.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{site.siteName}</h3>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {site.location}
                          </p>
                        </div>
                        <Badge variant="outline">{(site as any).role ?? "—"}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <label className="text-muted-foreground">Contractor</label>
                          <p className="font-medium">{(site as any).contractor ?? "—"}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Start Date</label>
                          <p className="font-medium">{formatDate(site.startDate as any)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">End Date</label>
                          <p className="font-medium">
                            {(site as any).endDate ? formatDate((site as any).endDate) : "Ongoing"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No previous work sites recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Certificate Inline Form */}
              
              {certs.length > 0 ? (
                <div className="space-y-4">
                 {certs.map((cert) => {
                    const status = getComplianceStatus(cert)

                    // Days remaining until expiry (date-only)
                    const msDay = 24 * 60 * 60 * 1000
                    let daysLeft: number | null = null
                    try {
                      if (cert?.expiryDate) {
                        const now = new Date(); now.setHours(0, 0, 0, 0)
                        const exp = new Date(cert.expiryDate as any); exp.setHours(0, 0, 0, 0)
                        if (!isNaN(exp.getTime())) {
                          daysLeft = Math.floor((exp.getTime() - now.getTime()) / msDay)
                        }
                      }
                    } catch {}

                    const isInvalid = (cert?.status === "INVALID") || (typeof daysLeft === "number" && daysLeft <= 0)
                    const StatusIcon = isInvalid ? AlertTriangle : status.icon

                    return (
                      <div key={cert.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{cert.name}</h3>
                            <p className="text-muted-foreground">
                              {cert.trainingProvider ? (
                                <>Training Provider: {cert.trainingProvider}</>
                              ) : (
                                <>Issued by {cert.issuer}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${isInvalid ? "bg-red-100" : status.bg}`}>
                              <StatusIcon className={`w-4 h-4 ${isInvalid ? "text-red-600" : status.color}`} />
                            </div>

                            <Badge
                              variant={status.badgeVariant}
                              className={
                                (isInvalid || cert.status === "INVALID" || cert.status === "EXPIRED")
                                  ? "bg-red-100 text-red-800"
                                  : (cert.status === "VALID" ? "bg-green-100 text-green-800" : "")
                              }
                            >
                              {isInvalid ? "INVALID" : (cert.status || "VALID")}
                            </Badge>

                            {typeof daysLeft === "number" && daysLeft <= 42 && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${daysLeft <= 0 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-700"}`}
                              >
                                {daysLeft <= 0
                                  ? (daysLeft === 0 ? "Expires today" : `Expired ${Math.abs(daysLeft)}d ago`)
                                  : `Expiring in ${daysLeft}d`}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <label className="text-muted-foreground">Issue Date</label>
                            <p className="font-medium">{formatDate(cert.issueDate as any)}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Expiry Date</label>
                            <p className="font-medium">{formatDate(cert.expiryDate as any)}</p>
                          </div>
                        </div>

                        {cert.documentUrl && (
                          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-900">Certificate Document</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDocumentDownload(cert.documentUrl!, `${cert.name}-certificate`)}
                                className="border-green-300 text-green-700 hover:bg-green-100"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })} 
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No compliance certificates recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Availability & Time Off
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Work Schedule */}
              <div>
                <h3 className="font-semibold mb-4">Work Schedule</h3>
                {avail ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${avail.mondayToFriday ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="text-sm">Monday - Friday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${avail.saturday ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="text-sm">Saturday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${avail.sunday ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="text-sm">Sunday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${avail.nightShifts ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="text-sm">Night Shifts</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No availability record</p>
                )}
              </div>

              {/* Time Off Requests (belongs to Operative, not Availability) */}
              <div>
                <h3 className="font-semibold mb-4">Time Off Requests</h3>
                {timeOff.length > 0 ? (
                  <div className="space-y-3">
                    {timeOff.map((request: any) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </span>
                          <Badge
                            variant={request.status === "APPROVED" ? "default" : "secondary"}
                            className={
                              request.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : request.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : ""
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No time off requests</p>
                )}
              </div>

              {/* Unavailable Dates */}
              {avail?.unavailableDates && avail.unavailableDates.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Unavailable Dates</h3>
                  <div className="flex flex-wrap gap-2">
                    {avail.unavailableDates.map((date, index) => (
                      <Badge key={index} variant="outline">
                        {formatDate(date as unknown as string)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unable To Work With */}
        <TabsContent value="unable">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Unable To Work With
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((operative as any)?.unableToWorkWith || []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No restrictions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {((operative as any)?.unableToWorkWith || []).map((u: any) => {
                    const isClient = u?.targetType === "CLIENT" || (u?.type === "client")
                    const label = isClient
                      ? (u?.targetClientId != null ? (uwClientNames as any)?.[Number(u.targetClientId)] : "Unknown client")
                      : (u?.targetOperativeId ? uwOperativeNames[String(u.targetOperativeId)] : "Unknown operative")
                    return (
                      <div key={u.id} className="flex items-start justify-between border rounded-md p-3">
                        <div className="flex items-center gap-2">
                          {isClient ? <Building className="w-4 h-4 text-primary" /> : <Users className="w-4 h-4 text-primary" />}
                          <span className="text-sm font-medium">
                            {isClient ? "Client" : "Operative"}: {label}
                          </span>
                        </div>
                        {u?.note && (
                          <span className="text-xs text-muted-foreground ml-4">{u.note}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Deleting this operative will remove their records and cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={async () => {
              if (isDeleting) return
              const ok = window.confirm(
                `Delete operative ${operative.personalDetails?.fullName || operative.id}? This cannot be undone.`,
              )
              if (!ok) return
              try {
                setIsDeleting(true)
                const res = await fetch(`/api/operatives/${operative.id}`, { method: "DELETE" })
                if (!res.ok) {
                  const msg = (await res.json().catch(() => null))?.error || `Failed (HTTP ${res.status})`
                  throw new Error(msg)
                }
                toast({ title: "Operative deleted" })
                try {
                  window.dispatchEvent(new Event("storage"))
                } catch {}
                onBack()
              } catch (e: any) {
                toast({ title: "Failed to delete operative", description: e?.message || "Unknown error" })
                console.error(e)
              } finally {
                setIsDeleting(false)
              }
            }}
            disabled={isDeleting}
            className="disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete Operative"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

