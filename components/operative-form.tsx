"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { User, Users, FileText, Upload, Building, Shield, Calendar, Save, X, Plus, Trash2, Briefcase } from "lucide-react"
import { DocumentUpload } from "@/components/document-upload"
import type { Operative, WorkSite, ComplianceCertificate, TimeOffRequest } from "@/lib/types"
import { toast } from "@/components/ui/use-toast"

interface OperativeFormProps {
  operative?: Operative
  onSave: (operative: Operative) => void
  onCancel: () => void
}

const EMPLOYMENT_TYPES = ["SELF_EMPLOYED", "CONTRACT", "TEMPORARY"] as const
const RTW_STATUSES = ["VERIFIED", "PENDING", "EXPIRED", "NOT_PROVIDED"] as const
const CERT_STATUSES = ["VALID", "EXPIRING_SOON", "EXPIRED", "INVALID"] as const

export function OperativeForm({ operative, onSave, onCancel }: OperativeFormProps) {
  const [activeTab, setActiveTab] = useState("personal")
  // Add-certificate style switcher for Compliance tab
  const [newCertType, setNewCertType] = useState<"general" | "asbestos">("general")
  const [showAddForm, setShowAddForm] = useState(false)
  // New unified add-certificate UI state (modeled after compliance-management)
  const [certificateType, setCertificateType] = useState<"general" | "asbestos">("general")
  const [newCertificate, setNewCertificate] = useState({
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    status: "VALID" as const,
    notes: "",
    pdfFile: null as File | null,
  })
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
  const [updating, setUpdating] = useState(false)
  const [watermarking, setWatermarking] = useState<string | null>(null)
  // Keys to force-reset upload widgets after adding a certificate
  const [genFormKey, setGenFormKey] = useState(0)
  const [asbFormKey, setAsbFormKey] = useState(0)
  const [newGeneralCert, setNewGeneralCert] = useState({
    name: "",
    expiryDate: "",
    trainingProvider: "",
    contact: "",
    certificateDetails: "",
    verifiedWith: "",
    verifiedBy: "",
    dateVerified: "",
    documentUrl: "",
  })
  const [newAsbestosCert, setNewAsbestosCert] = useState({
    trainingProvider: "",
    contact: "",
    certificateDetails: "",
    verifiedWith: "",
    verifiedBy: "",
    dateVerified: "",
    issueDate: "",
    expiryDate: "",
    status: "VALID" as const,
    documentUrl: "",
  })

  // ---------- Local form state (keeps full model shape for UI),
  // but only submits fields supported by current API (personalDetails + related) ----------
  const [formData, setFormData] = useState(() => {
    const nowIso = new Date().toISOString()

    if (operative) {
      // Normalize a few fields to strings the inputs expect
      return {
        ...operative,
        personalDetails: {
          fullName: operative.personalDetails?.fullName ?? "",
          email: operative.personalDetails?.email ?? "",
          phone: operative.personalDetails?.phone ?? "",
          address: operative.personalDetails?.address ?? "",
          dateOfBirth: operative.personalDetails?.dateOfBirth
            ? operative.personalDetails.dateOfBirth.slice(0, 10)
            : "",
          nationalInsurance: operative.personalDetails?.nationalInsurance ?? "",
          employmentType:
            operative.personalDetails?.employmentType && EMPLOYMENT_TYPES.includes(operative.personalDetails.employmentType as any)
              ? operative.personalDetails.employmentType
              : "SELF_EMPLOYED",
          payrollNumber: operative.personalDetails?.payrollNumber ?? "",
          id: operative.personalDetails?.id ?? "",
          operativeId: operative.id,
        },
        nextOfKin: operative.nextOfKin ?? {
          name: "",
          relationship: "",
          phone: "",
          email: "",
          address: "",
        },
        rightToWork: operative.rightToWork
          ? {
              ...operative.rightToWork,
              expiryDate: operative.rightToWork.expiryDate
                ? operative.rightToWork.expiryDate.slice(0, 10)
                : "",
              status: RTW_STATUSES.includes(operative.rightToWork.status as any)
                ? operative.rightToWork.status
                : "NOT_PROVIDED",
            }
          : {
              country: "United Kingdom",
              status: "NOT_PROVIDED",
              expiryDate: "",
              documentUrl: "",
            },
        availability:
          operative.availability ??
          {
            mondayToFriday: true,
            saturday: false,
            sunday: false,
            nightShifts: false,
            unavailableDates: [],
          },
        // Time off requests live on Operative in your schema, not availability
        timeOffRequests: (operative as any).timeOffRequests ?? [],
        workSites: (operative.workSites ?? []).map((s) => ({
          ...s,
          startDate: (s as any).startDate ? (s as any).startDate.slice(0, 10) : "",
          endDate: (s as any).endDate ? (s as any).endDate.slice(0, 10) : "",
        })),
        complianceCertificates: (operative.complianceCertificates ?? []).map((c) => ({
          ...c,
          issueDate: (c as any).issueDate ? (c as any).issueDate.slice(0, 10) : "",
          expiryDate: (c as any).expiryDate ? (c as any).expiryDate.slice(0, 10) : "",
          status: CERT_STATUSES.includes(c.status as any) ? c.status : "VALID",
          certType: (c as any).certType ?? "GENERAL",
        })),
        trade: operative.trade ?? undefined,
        createdAt: operative.createdAt ?? nowIso,
        updatedAt: nowIso,
      }
    }

    // New operative defaults
    return {
      id: "", // server will generate UUID
      personalDetails: {
        fullName: "",
        email: "",
        phone: "",
        address: "",
        dateOfBirth: "",
        nationalInsurance: "",
        employmentType: "SELF_EMPLOYED",
        payrollNumber: "",
      },
      nextOfKin: {
        name: "",
        relationship: "",
        phone: "",
        email: "",
        address: "",
      },
      rightToWork: {
        country: "United Kingdom",
        status: "NOT_PROVIDED",
        expiryDate: "",
        documentUrl: "",
      },
      workSites: [] as WorkSite[],
      complianceCertificates: [] as ComplianceCertificate[],
      availability: {
        mondayToFriday: true,
        saturday: false,
        sunday: false,
        nightShifts: false,
        unavailableDates: [] as string[],
      },
      // Time off (separate in schema)
      timeOffRequests: [] as TimeOffRequest[],
      createdAt: nowIso,
      updatedAt: nowIso,
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(operative?.id)

  // ----------------- Validation -----------------
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.personalDetails.fullName.trim()) {
      newErrors["personalDetails.fullName"] = "Full name is required"
    }
    if (!formData.personalDetails.email.trim()) {
      newErrors["personalDetails.email"] = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.personalDetails.email)) {
      newErrors["personalDetails.email"] = "Invalid email format"
    }
    if (!formData.personalDetails.phone.trim()) {
      newErrors["personalDetails.phone"] = "Phone number is required"
    }
    if (!formData.personalDetails.payrollNumber.trim()) {
      newErrors["personalDetails.payrollNumber"] = "Payroll number is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ----------------- API Save -----------------
  const handleSave = async () => {
    if (!validateForm()) {
      setErrors((prev) => ({ ...prev, _root: "Please correct the highlighted fields before saving." }))
      try {
        window.scrollTo({ top: 0, behavior: "smooth" })
      } catch {}
      return
    }

    const payload = {
      personalDetails: {
        fullName: formData.personalDetails.fullName,
        email: formData.personalDetails.email,
        phone: formData.personalDetails.phone,
        address: formData.personalDetails.address,
        dateOfBirth: formData.personalDetails.dateOfBirth
          ? new Date(formData.personalDetails.dateOfBirth).toISOString()
          : null,
        nationalInsurance: formData.personalDetails.nationalInsurance,
        employmentType: formData.personalDetails.employmentType, // enum
        payrollNumber: formData.personalDetails.payrollNumber,
      },
      nextOfKin: formData.nextOfKin,
      rightToWork: {
        country: formData.rightToWork.country,
        status: formData.rightToWork.status,
        documentUrl: (formData.rightToWork as any).documentUrl || null,
        expiryDate: formData.rightToWork.expiryDate
          ? new Date(formData.rightToWork.expiryDate).toISOString()
          : null,
      },
      availability: {
        mondayToFriday: formData.availability.mondayToFriday,
        saturday: formData.availability.saturday,
        sunday: formData.availability.sunday,
        nightShifts: formData.availability.nightShifts,
        unavailableDates: (formData.availability.unavailableDates || []) as any,
      },
    }

    try {
      setIsSaving(true)
      let res: Response
      if (isEditing && operative?.id) {
        res = await fetch(`/api/operatives/${operative.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/operatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await safeJson(res)
        throw new Error(err?.error || `Failed to save (HTTP ${res.status})`)
      }

      const saved = (await res.json()) as Operative

      // Merge back into full local shape (to keep UI tabs intact)
      const merged: Operative = {
        ...formData,
        ...saved,
        personalDetails: {
          ...formData.personalDetails,
          ...saved.personalDetails,
          dateOfBirth: saved.personalDetails?.dateOfBirth
            ? saved.personalDetails.dateOfBirth
            : formData.personalDetails.dateOfBirth
              ? new Date(formData.personalDetails.dateOfBirth).toISOString()
              : "",
        } as any,
        updatedAt: new Date().toISOString(),
      }

      onSave(merged)
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, _root: e.message || "Failed to save operative" }))
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const safeJson = async (res: Response) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  // ----------------- Field updaters -----------------
  const updatePersonalDetails = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [field]: value },
    }))
    if (errors[`personalDetails.${field}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`personalDetails.${field}`]
        return next
      })
    }
  }

  const updateNextOfKin = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      nextOfKin: { ...prev.nextOfKin, [field]: value },
    }))
    if (errors[`nextOfKin.${field}`]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`nextOfKin.${field}`]
        return next
      })
    }
  }

  const updateRightToWork = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      rightToWork: { ...prev.rightToWork, [field]: value },
    }))
  }

  const handleDocumentUpload = (_file: File, url: string) => {
    setFormData((prev: any) => ({
      ...prev,
      rightToWork: {
        ...prev.rightToWork,
        documentUrl: url,
        status: "PENDING", // enum
      },
    }))
  }

  const handleCertificateDocumentUpload = (index: number, _file: File, url: string) => {
    const getSessionId = () => {
      try {
        const k = "portal_session_id"
        let v = window.localStorage.getItem(k)
        if (!v) {
          v = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
          window.localStorage.setItem(k, v)
        }
        return v
      } catch {
        return "anonymous"
      }
    }
    setFormData((prev: any) => ({
      ...prev,
      complianceCertificates: prev.complianceCertificates.map((c: any, i: number) =>
        i === index
          ? {
              ...c,
              documentUrl: url,
              verifiedBy: getSessionId(),
              dateVerified: new Date().toISOString(),
            }
          : c,
      ),
    }))
  }

  const handleNewCertificateUpload = (_file: File, url: string) => {
    const getSessionId = () => {
      try {
        const k = "portal_session_id"
        let v = window.localStorage.getItem(k)
        if (!v) {
          v = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
          window.localStorage.setItem(k, v)
        }
        return v
      } catch {
        return "anonymous"
      }
    }
    if (newCertType === "general") {
      setNewGeneralCert((prev) => ({ ...prev, documentUrl: url, verifiedBy: getSessionId(), dateVerified: new Date().toISOString() }))
    } else {
      setNewAsbestosCert((prev) => ({ ...prev, documentUrl: url, verifiedBy: getSessionId(), dateVerified: new Date().toISOString() }))
    }
  }

  // Helpers for new UI
  const updateAsbestosItem = (itemKey: string, field: string, value: any) => {
    setAsbestosCertificate((prev: any) => ({
      ...prev,
      items: {
        ...prev.items,
        [itemKey]: {
          ...prev.items[itemKey],
          [field]: value,
        },
      },
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) return
    if (file.type !== "application/pdf") return
    if (certificateType === "general") {
      setNewCertificate((prev) => ({ ...prev, pdfFile: file }))
    } else {
      setAsbestosCertificate((prev: any) => ({ ...prev, pdfFile: file }))
    }
  }

  const uploadPdf = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch {
      return null
    }
  }

  const getSessionId = () => {
    try {
      const k = "portal_session_id"
      let v = window.localStorage.getItem(k)
      if (!v) { v = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; window.localStorage.setItem(k, v) }
      return v
    } catch { return "anonymous" }
  }

  const handleBulkUpdate = async () => {
    if (!newCertificate.name) return
    setUpdating(true)
    try {
      let url: string | null = null
      if (newCertificate.pdfFile) {
        setWatermarking("Processing PDF...")
        url = await uploadPdf(newCertificate.pdfFile)
        setWatermarking(null)
      }
      const toAdd: any = {
        id: `cert_${Date.now()}`,
        name: newCertificate.name.trim(),
        issuer: newCertificate.issuer.trim(),
        issueDate: newCertificate.issueDate || "",
        expiryDate: newCertificate.expiryDate || "",
        status: newCertificate.status,
        notes: newCertificate.notes.trim() || undefined,
        documentUrl: url || undefined,
        certType: "GENERAL",
        operativeId: operative?.id || "",
      }
      setFormData((prev: any) => ({
        ...prev,
        complianceCertificates: [...prev.complianceCertificates, toAdd],
      }))
      setNewCertificate({ name: "", issuer: "", issueDate: "", expiryDate: "", status: "VALID", notes: "", pdfFile: null })
    } finally {
      setUpdating(false)
    }
  }

  const handleAsbestosBulkUpdate = async () => {
    const anyPresent = Object.values(asbestosCertificate.items as any).some((it: any) => it.present)
    if (!anyPresent) return
    setUpdating(true)
    try {
      let url: string | null = null
      if (asbestosCertificate.pdfFile) {
        setWatermarking("Processing PDF...")
        url = await uploadPdf(asbestosCertificate.pdfFile)
        setWatermarking(null)
      }
      const sessionId = getSessionId()
      const toAdd: any[] = []
      Object.entries(asbestosCertificate.items as any).forEach(([key, item]: any) => {
        if (!item.present) return
        const raw = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
        const name = raw.startsWith("Asbestos ") ? raw.slice(9) : raw
        toAdd.push({
          id: `cert_${Date.now()}_${key}`,
          name,
          expiryDate: item.expiryDate || "",
          trainingProvider: item.trainingProvider || undefined,
          contact: item.contactInfo || undefined,
          certificateDetails: item.certificateDetails || undefined,
          verifiedWith: item.verifiedWith || undefined,
          verifiedBy: item.verifiedBy || sessionId,
          dateVerified: item.dateVerified || new Date().toISOString(),
          documentUrl: url || undefined,
          certType: "ASBESTOS",
          operativeId: operative?.id || "",
        })
      })
      if (toAdd.length) {
        setFormData((prev: any) => ({
          ...prev,
          complianceCertificates: [...prev.complianceCertificates, ...toAdd],
        }))
      }
      setAsbestosCertificate({
        pdfFile: null,
        items: {
          asbestosTraining: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
          asbestosMedical: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
          fullFaceFit: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
          halfFaceFit: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
          maskService: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
        },
      })
    } finally {
      setUpdating(false)
    }
  }

  // Work sites
  const addWorkSite = () => {
    const newSite: WorkSite = {
      id: `site_${Date.now()}`,
      siteName: "",
      location: "",
      startDate: "",
      endDate: "",
      role: "",
      contractor: "",
      operativeId: operative?.id || "",
    } as any
    setFormData((prev: any) => ({ ...prev, workSites: [...prev.workSites, newSite] }))
  }

  const updateWorkSite = (index: number, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      workSites: prev.workSites.map((s: any, i: number) => (i === index ? { ...s, [field]: value } : s)),
    }))
  }

  const removeWorkSite = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      workSites: prev.workSites.filter((_: any, i: number) => i !== index),
    }))
  }

  // Certificates: header button reveals the new add UI with cleared fields
  const addComplianceCertificate = () => {
    setCertificateType("general")
    setNewCertificate({ name: "", issuer: "", issueDate: "", expiryDate: "", status: "VALID", notes: "", pdfFile: null })
    setAsbestosCertificate({
      pdfFile: null,
      items: {
        asbestosTraining: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
        asbestosMedical: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
        fullFaceFit: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
        halfFaceFit: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
        maskService: { present: false, expiryDate: "", trainingProvider: "", contactInfo: "", certificateDetails: "", verifiedWith: "", verifiedBy: "", dateVerified: "" },
      },
    })
    setShowAddForm(true)
  }

  const updateComplianceCertificate = (index: number, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      complianceCertificates: prev.complianceCertificates.map((c: any, i: number) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }))
  }

  const removeComplianceCertificate = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      complianceCertificates: prev.complianceCertificates.filter((_: any, i: number) => i !== index),
    }))
  }

  // Time off (at Operative level)
  const addTimeOffRequest = () => {
    const newReq: TimeOffRequest = {
      id: `to_${Date.now()}`,
      startDate: "",
      endDate: "",
      reason: "",
      status: "PENDING",
      operativeId: operative?.id || "",
    } as any
    setFormData((prev: any) => ({
      ...prev,
      timeOffRequests: [...(prev.timeOffRequests ?? []), newReq],
    }))
  }

  const updateTimeOffRequest = (index: number, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      timeOffRequests: (prev.timeOffRequests ?? []).map((r: any, i: number) =>
        i === index ? { ...r, [field]: value } : r
      ),
    }))
  }

  const removeTimeOffRequest = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      timeOffRequests: (prev.timeOffRequests ?? []).filter((_: any, i: number) => i !== index),
    }))
  }

  const updateAvailability = (field: string, value: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      availability: { ...prev.availability, [field]: value },
    }))
  }

  const formatEnumLabel = (val: string) => val.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())

  const rootError = errors._root

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? "Edit Operative" : "Add New Operative"}</h1>
          <p className="text-muted-foreground">
            {isEditing ? "Update operative information" : "Enter details for the new operative"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 disabled:opacity-60">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Operative"}
          </Button>
        </div>
      </div>

      {rootError && <p className="text-sm text-red-600">{rootError}</p>}

      {/* Top-level fields removed: trade and status are no longer collected here */}

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
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
        </TabsList>

        {/* Personal Details */}
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
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.personalDetails.fullName}
                      onChange={(e) => updatePersonalDetails("fullName", e.target.value)}
                      className={errors["personalDetails.fullName"] ? "border-red-500" : ""}
                    />
                    {errors["personalDetails.fullName"] && (
                      <p className="text-sm text-red-500 mt-1">{errors["personalDetails.fullName"]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.personalDetails.email}
                      onChange={(e) => updatePersonalDetails("email", e.target.value)}
                      className={errors["personalDetails.email"] ? "border-red-500" : ""}
                    />
                    {errors["personalDetails.email"] && (
                      <p className="text-sm text-red-500 mt-1">{errors["personalDetails.email"]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.personalDetails.phone}
                      onChange={(e) => updatePersonalDetails("phone", e.target.value)}
                      className={errors["personalDetails.phone"] ? "border-red-500" : ""}
                    />
                    {errors["personalDetails.phone"] && (
                      <p className="text-sm text-red-500 mt-1">{errors["personalDetails.phone"]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.personalDetails.dateOfBirth}
                      onChange={(e) => updatePersonalDetails("dateOfBirth", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.personalDetails.address}
                      onChange={(e) => updatePersonalDetails("address", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="nationalInsurance">National Insurance Number</Label>
                    <Input
                      id="nationalInsurance"
                      value={formData.personalDetails.nationalInsurance}
                      onChange={(e) => updatePersonalDetails("nationalInsurance", e.target.value)}
                      placeholder="QQ123456C"
                    />
                  </div>

                  <div>
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select
                      value={formData.personalDetails.employmentType}
                      onValueChange={(value) => updatePersonalDetails("employmentType", value)}
                    >
                      <SelectTrigger id="employmentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatEnumLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payrollNumber">Payroll Number *</Label>
                    <Input
                      id="payrollNumber"
                      value={formData.personalDetails.payrollNumber}
                      onChange={(e) => updatePersonalDetails("payrollNumber", e.target.value)}
                      className={errors["personalDetails.payrollNumber"] ? "border-red-500" : ""}
                    />
                    {errors["personalDetails.payrollNumber"] && (
                      <p className="text-sm text-red-500 mt-1">{errors["personalDetails.payrollNumber"]}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Next of Kin */}
        <TabsContent value="nextofkin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md-grid-cols-2 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="kinName">Contact Name *</Label>
                    <Input
                      id="kinName"
                      value={formData.nextOfKin.name}
                      onChange={(e) => updateNextOfKin("name", e.target.value)}
                      className={errors["nextOfKin.name"] ? "border-red-500" : ""}
                    />
                    {errors["nextOfKin.name"] && (
                      <p className="text-sm text-red-500 mt-1">{errors["nextOfKin.name"]}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="kinRelationship">Relationship</Label>
                    <Input
                      id="kinRelationship"
                      value={formData.nextOfKin.relationship}
                      onChange={(e) => updateNextOfKin("relationship", e.target.value)}
                      placeholder="e.g., Spouse, Parent, Sibling"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="kinPhone">Phone Number *</Label>
                    <Input
                      id="kinPhone"
                      value={formData.nextOfKin.phone}
                      onChange={(e) => updateNextOfKin("phone", e.target.value)}
                      className={errors["nextOfKin.phone"] ? "border-red-500" : ""}
                    />
                    {errors["nextOfKin.phone"] && (
                      <p className="text-sm text-red-500 mt-1">{errors["nextOfKin.phone"]}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="kinEmail">Email Address</Label>
                    <Input
                      id="kinEmail"
                      type="email"
                      value={formData.nextOfKin.email || ""}
                      onChange={(e) => updateNextOfKin("email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="kinAddress">Address</Label>
                <Textarea
                  id="kinAddress"
                  value={formData.nextOfKin.address}
                  onChange={(e) => updateNextOfKin("address", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Right to Work */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Right to Work Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.rightToWork.country}
                    onChange={(e) => updateRightToWork("country", e.target.value)}
                    placeholder="United Kingdom"
                  />
                </div>

                <div>
                  <Label htmlFor="rtwStatus">Status</Label>
                  <Select
                    value={formData.rightToWork.status}
                    onValueChange={(value) => updateRightToWork("status", value)}
                  >
                    <SelectTrigger id="rtwStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RTW_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatEnumLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="expiryDate">Expiry Date (if applicable)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.rightToWork.expiryDate || ""}
                  onChange={(e) => updateRightToWork("expiryDate", e.target.value)}
                />
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Right to Work Document</Label>
                <DocumentUpload
                  onUpload={handleDocumentUpload}
                  existingUrl={formData.rightToWork.documentUrl}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  maxSize={10}
                  label="Upload Right to Work Document"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Sites */}
        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Previous Work Sites
                </CardTitle>
                <Button onClick={addWorkSite} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Site
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.workSites.length > 0 ? (
                <div className="space-y-4">
                  {formData.workSites.map((site: any, index: number) => (
                    <div key={site.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Work Site {index + 1}</h3>
                        <Button
                          onClick={() => removeWorkSite(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Site Name</Label>
                          <Input
                            value={site.siteName}
                            onChange={(e) => updateWorkSite(index, "siteName", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Location</Label>
                          <Input
                            value={site.location}
                            onChange={(e) => updateWorkSite(index, "location", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Role</Label>
                          <Input value={site.role} onChange={(e) => updateWorkSite(index, "role", e.target.value)} />
                        </div>
                        <div>
                          <Label>Contractor</Label>
                          <Input
                            value={site.contractor}
                            onChange={(e) => updateWorkSite(index, "contractor", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={site.startDate}
                            onChange={(e) => updateWorkSite(index, "startDate", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={site.endDate || ""}
                            onChange={(e) => updateWorkSite(index, "endDate", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No work sites added yet</p>
                  <Button onClick={addWorkSite} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Site
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Compliance Certificates
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={addComplianceCertificate} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Certificate
                  </Button>
                  {operative?.id && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const getSessionId = () => {
                            try {
                              const k = "portal_session_id"
                              let v = window.localStorage.getItem(k)
                              if (!v) { v = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`; window.localStorage.setItem(k, v) }
                              return v
                            } catch { return "anonymous" }
                          }
                          const sessionId = getSessionId()
                          const payload = {
                            complianceCertificates: (formData.complianceCertificates || []).map((c: any) => ({
                              name: c.name,
                              expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString() : null,
                              documentUrl: c.documentUrl || null,
                              trainingProvider: c.trainingProvider || c.issuer || null,
                              contact: c.contact || null,
                              certificateDetails: c.certificateDetails || null,
                              verifiedWith: c.verifiedWith || null,
                              verifiedBy: c.verifiedBy || sessionId,
                              dateVerified: c.dateVerified ? new Date(c.dateVerified).toISOString() : null,
                              // legacy/back-compat
                              issuer: c.issuer || c.trainingProvider || null,
                              issueDate: c.issueDate ? new Date(c.issueDate).toISOString() : null,
                              status: c.status || null,
                              notes: c.notes || null,
                              certType: c.certType || "GENERAL",
                            })),
                          }
                          const res = await fetch(`/api/operatives/${operative.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          })
                          if (!res.ok) {
                            const err = await res.json().catch(() => null)
                            throw new Error(err?.error || `Failed (HTTP ${res.status})`)
                          }
                          const updated = (await res.json()) as Operative
                          setFormData((prev: any) => ({
                            ...prev,
                            complianceCertificates: ((updated as any).complianceCertificates || []).map((c: any) => ({
                              ...c,
                              issueDate: c.issueDate ? String(c.issueDate).slice(0, 10) : "",
                              expiryDate: c.expiryDate ? String(c.expiryDate).slice(0, 10) : "",
                              dateVerified: c.dateVerified ? String(c.dateVerified).slice(0, 10) : "",
                              status: CERT_STATUSES.includes(c.status as any) ? c.status : "VALID",
                              certType: (c as any).certType || "GENERAL",
                            })),
                          }))
                          toast({ title: "Certificates saved" })
                        } catch (e: any) {
                          toast({ title: "Failed to save certificates", description: e?.message || "Unknown error" })
                          console.error(e)
                        }
                      }}
                    >
                      Save Certificates
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* New Add Certificate UI (modeled after compliance-management) */}
              {showAddForm && (
                <div className="mb-6 rounded-lg border p-4">
                <div className="flex gap-2 mb-4">
                  <Button variant={certificateType === "general" ? "default" : "outline"} size="sm" onClick={() => setCertificateType("general")}>General Certificate</Button>
                  <Button variant={certificateType === "asbestos" ? "default" : "outline"} size="sm" onClick={() => setCertificateType("asbestos")}>Asbestos Certificate</Button>
                </div>
                {certificateType === "general" ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cert-name">Certificate Name</Label>
                        <Input id="cert-name" value={newCertificate.name} onChange={(e) => setNewCertificate((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g., CSCS Card, First Aid" />
                      </div>
                      <div>
                        <Label htmlFor="cert-issuer">Issuer</Label>
                        <Input id="cert-issuer" value={newCertificate.issuer} onChange={(e) => setNewCertificate((prev) => ({ ...prev, issuer: e.target.value }))} placeholder="e.g., CITB, Red Cross" />
                      </div>
                      <div>
                        <Label htmlFor="cert-issue">Issue Date</Label>
                        <Input id="cert-issue" type="date" value={newCertificate.issueDate} onChange={(e) => setNewCertificate((prev) => ({ ...prev, issueDate: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="cert-expiry">Expiry Date</Label>
                        <Input id="cert-expiry" type="date" value={newCertificate.expiryDate} onChange={(e) => setNewCertificate((prev) => ({ ...prev, expiryDate: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cert-notes">Notes (Optional)</Label>
                      <Textarea id="cert-notes" value={newCertificate.notes} onChange={(e) => setNewCertificate((prev) => ({ ...prev, notes: e.target.value }))} rows={2} />
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
                        <p className="text-xs text-muted-foreground mt-1">PDF will be automatically processed before saving</p>
                      )}
                    </div>
                    {watermarking && (
                      <div className="flex items-center gap-2 text-sm text-blue-600"> <Upload className="w-4 h-4 animate-spin" /> {watermarking} </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleBulkUpdate} disabled={!newCertificate.name || updating || !!watermarking} className="bg-primary hover:bg-primary/90">
                        <Save className="w-4 h-4 mr-2" />
                        {updating ? "Updating..." : "Add Certificate"}
                      </Button>
                      <Button variant="outline" onClick={() => { setNewCertificate({ name: "", issuer: "", issueDate: "", expiryDate: "", status: "VALID", notes: "", pdfFile: null }); setShowAddForm(false) }}>
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
                        <p className="text-xs text-muted-foreground mt-1">PDF will be automatically processed before saving</p>
                      )}
                    </div>
                    <div className="space-y-6">
                      <h4 className="font-semibold">Asbestos Certificate Items</h4>
                      {Object.entries(asbestosCertificate.items as any).map(([key, item]: any) => {
                        const displayName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
                        return (
                          <div key={key} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={item.present} onCheckedChange={(checked) => updateAsbestosItem(key, "present", checked)} />
                              <Label className="font-medium">{displayName}</Label>
                              {item.present && (
                                <Badge variant="secondary" className="text-xs">Present in PDF</Badge>
                              )}
                            </div>
                            {item.present && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                                <div>
                                  <Label className="text-xs">Expiry Date</Label>
                                  <Input type="date" value={item.expiryDate} onChange={(e) => updateAsbestosItem(key, "expiryDate", e.target.value)} className="text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Training Provider</Label>
                                  <Input value={item.trainingProvider} onChange={(e) => updateAsbestosItem(key, "trainingProvider", e.target.value)} placeholder="Provider name" className="text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Contact Information</Label>
                                  <Input value={item.contactInfo} onChange={(e) => updateAsbestosItem(key, "contactInfo", e.target.value)} placeholder="Phone/Email" className="text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Certificate Details</Label>
                                  <Input value={item.certificateDetails} onChange={(e) => updateAsbestosItem(key, "certificateDetails", e.target.value)} placeholder="Certificate number/details" className="text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Verified With</Label>
                                  <Input value={item.verifiedWith} onChange={(e) => updateAsbestosItem(key, "verifiedWith", e.target.value)} placeholder="Organization/Person" className="text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Verified By</Label>
                                  <Input value={item.verifiedBy} onChange={(e) => updateAsbestosItem(key, "verifiedBy", e.target.value)} placeholder="Verifier name" className="text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Date Verified</Label>
                                  <Input type="date" value={item.dateVerified} onChange={(e) => updateAsbestosItem(key, "dateVerified", e.target.value)} className="text-sm" />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {watermarking && (
                      <div className="flex items-center gap-2 text-sm text-blue-600"> <Upload className="w-4 h-4 animate-spin" /> {watermarking} </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleAsbestosBulkUpdate} disabled={!asbestosCertificate.pdfFile || updating || !!watermarking || !Object.values(asbestosCertificate.items as any).some((it: any) => it.present)} className="bg-primary hover:bg-primary/90">
                        <Save className="w-4 h-4 mr-2" />
                        {updating ? "Updating..." : watermarking ? "Processing..." : "Add Asbestos Certificates"}
                      </Button>
                      <Button variant="outline" onClick={() => { setAsbestosCertificate({ pdfFile: null, items: asbestosCertificate.items }); setShowAddForm(false) }}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
                </div>
              )}
              {formData.complianceCertificates.length > 0 && (
                <div className="space-y-6">
                  {formData.complianceCertificates.map((cert: any, index: number) => (
                    <div key={cert.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Certificate {index + 1}</h3>
                          <Badge variant="outline" className="text-[10px]">
                            {(cert.certType || "GENERAL") === "ASBESTOS" ? "Asbestos" : "General"}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => removeComplianceCertificate(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={cert.certType || "GENERAL"}
                              onValueChange={(value) => updateComplianceCertificate(index, "certType", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GENERAL">General</SelectItem>
                                <SelectItem value="ASBESTOS">Asbestos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>{(cert.certType || "GENERAL") === "ASBESTOS" ? "Asbestos Type" : "Certificate Name"}</Label>
                            {(cert.certType || "GENERAL") === "ASBESTOS" ? (
                              <Select
                                value={cert.name || ""}
                                onValueChange={(v) => updateComplianceCertificate(index, "name", v)}
                              >
                                <SelectTrigger className="min-w-[180px]">
                                  <SelectValue placeholder="Asbestos type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Training">Training</SelectItem>
                                  <SelectItem value="Medical">Medical</SelectItem>
                                  <SelectItem value="Full Face Fit">Full Face Fit</SelectItem>
                                  <SelectItem value="Half Face Fit">Half Face Fit</SelectItem>
                                  <SelectItem value="Mask Service">Mask Service</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={cert.name}
                                onChange={(e) => updateComplianceCertificate(index, "name", e.target.value)}
                                placeholder="e.g., CSCS Card, First Aid"
                              />
                            )}
                          </div>
                          <div>
                            <Label>Training Provider</Label>
                            <Input
                              value={cert.trainingProvider || cert.issuer || ""}
                              onChange={(e) => updateComplianceCertificate(index, "trainingProvider", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Contact</Label>
                            <Input
                              value={cert.contact || ""}
                              onChange={(e) => updateComplianceCertificate(index, "contact", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Expiry Date</Label>
                            <Input
                              type="date"
                              value={cert.expiryDate}
                              onChange={(e) => updateComplianceCertificate(index, "expiryDate", e.target.value)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Certification Details</Label>
                            <Input
                              value={cert.certificateDetails || ""}
                              onChange={(e) => updateComplianceCertificate(index, "certificateDetails", e.target.value)}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Verified With</Label>
                            <Input
                              value={cert.verifiedWith || ""}
                              onChange={(e) => updateComplianceCertificate(index, "verifiedWith", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Verified By</Label>
                            <Input
                              value={cert.verifiedBy || ""}
                              onChange={(e) => updateComplianceCertificate(index, "verifiedBy", e.target.value)}
                              placeholder="session id"
                            />
                          </div>
                          <div>
                            <Label>Date Verified</Label>
                            <Input
                              type="date"
                              value={(cert.dateVerified ? String(cert.dateVerified).slice(0, 10) : "") as any}
                              onChange={(e) => updateComplianceCertificate(index, "dateVerified", e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">Certificate Document</Label>
                          <DocumentUpload
                            onUpload={(file, url) => handleCertificateDocumentUpload(index, file, url)}
                            existingUrl={cert.documentUrl}
                            accept=".pdf,.jpg,.jpeg,.png"
                            maxSize={5}
                            label="Upload Certificate"
                          />
                          {(cert.verifiedBy || cert.dateVerified) && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Verified {cert.dateVerified ? new Date(cert.dateVerified).toLocaleDateString() : ""}
                              {cert.verifiedBy ? ` by ${cert.verifiedBy}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability */}
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
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mondayToFriday"
                      checked={formData.availability.mondayToFriday}
                      onCheckedChange={(checked) => updateAvailability("mondayToFriday", !!checked)}
                    />
                    <Label htmlFor="mondayToFriday">Monday to Friday</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saturday"
                      checked={formData.availability.saturday}
                      onCheckedChange={(checked) => updateAvailability("saturday", !!checked)}
                    />
                    <Label htmlFor="saturday">Saturday</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sunday"
                      checked={formData.availability.sunday}
                      onCheckedChange={(checked) => updateAvailability("sunday", !!checked)}
                    />
                    <Label htmlFor="sunday">Sunday</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nightShifts"
                      checked={formData.availability.nightShifts}
                      onCheckedChange={(checked) => updateAvailability("nightShifts", !!checked)}
                    />
                    <Label htmlFor="nightShifts">Night Shifts</Label>
                  </div>
                </div>
              </div>

              {/* Time Off Requests (kept in local UI; not persisted by base API) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Time Off Requests</h3>
                  <Button onClick={addTimeOffRequest} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Request
                  </Button>
                </div>

                {formData.timeOffRequests.length > 0 ? (
                  <div className="space-y-4">
                    {formData.timeOffRequests.map((request: any, index: number) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Request {index + 1}</h4>
                          <Button
                            onClick={() => removeTimeOffRequest(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={request.startDate}
                              onChange={(e) => updateTimeOffRequest(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={request.endDate}
                              onChange={(e) => updateTimeOffRequest(index, "endDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select
                              value={request.status}
                              onValueChange={(value) => updateTimeOffRequest(index, "status", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Reason</Label>
                            <Input
                              value={request.reason}
                              onChange={(e) => updateTimeOffRequest(index, "reason", e.target.value)}
                              placeholder="e.g., Holiday, Medical"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No time off requests</p>
                )}
              </div>

              {/* Unavailable Dates */}
              {formData.availability.unavailableDates.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Unavailable Dates</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.availability.unavailableDates.map((d: string, i: number) => (
                      <span key={i} className="text-sm px-2 py-1 border rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}






