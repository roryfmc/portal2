"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { User, Users, FileText, Building, Shield, Calendar, Save, X, Plus, Trash2, Briefcase } from "lucide-react"
import { DocumentUpload } from "@/components/document-upload"
import type { Operative, WorkSite, ComplianceCertificate, TimeOffRequest } from "@/lib/types"

interface OperativeFormProps {
  operative?: Operative
  onSave: (operative: Operative) => void
  onCancel: () => void
}

const EMPLOYMENT_TYPES = ["SELF_EMPLOYED", "CONTRACT", "TEMPORARY"] as const
const RTW_STATUSES = ["VERIFIED", "PENDING", "EXPIRED", "NOT_PROVIDED"] as const
const CERT_STATUSES = ["VALID", "EXPIRING_SOON", "EXPIRED"] as const

export function OperativeForm({ operative, onSave, onCancel }: OperativeFormProps) {
  const [activeTab, setActiveTab] = useState("personal")

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
    setFormData((prev: any) => ({
      ...prev,
      complianceCertificates: prev.complianceCertificates.map((c: any, i: number) =>
        i === index ? { ...c, documentUrl: url } : c
      ),
    }))
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

  // Certificates
  const addComplianceCertificate = () => {
    const newCert: ComplianceCertificate = {
      id: `cert_${Date.now()}`,
      name: "",
      issuer: "",
      issueDate: "",
      expiryDate: "",
      status: "VALID",
      operativeId: operative?.id || "",
    } as any
    setFormData((prev: any) => ({
      ...prev,
      complianceCertificates: [...prev.complianceCertificates, newCert],
    }))
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
                <Button onClick={addComplianceCertificate} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Certificate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.complianceCertificates.length > 0 ? (
                <div className="space-y-6">
                  {formData.complianceCertificates.map((cert: any, index: number) => (
                    <div key={cert.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Certificate {index + 1}</h3>
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
                            <Label>Certificate Name</Label>
                            <Input
                              value={cert.name}
                              onChange={(e) => updateComplianceCertificate(index, "name", e.target.value)}
                              placeholder="e.g., CSCS Card, First Aid"
                            />
                          </div>
                          <div>
                            <Label>Issuer</Label>
                            <Input
                              value={cert.issuer}
                              onChange={(e) => updateComplianceCertificate(index, "issuer", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Issue Date</Label>
                            <Input
                              type="date"
                              value={cert.issueDate}
                              onChange={(e) => updateComplianceCertificate(index, "issueDate", e.target.value)}
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
                            <Label>Status</Label>
                            <Select
                              value={cert.status}
                              onValueChange={(value) => updateComplianceCertificate(index, "status", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CERT_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {formatEnumLabel(s)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No certificates added yet</p>
                  <Button onClick={addComplianceCertificate} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Certificate
                  </Button>
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
