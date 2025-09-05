"use client"

import { useState } from "react"
import { CalendarView } from "@/components/calendar-view"
import { OperativeList } from "@/components/operative-list"
import { OperativeCard } from "@/components/operative-card"
import { OperativeForm } from "@/components/operative-form"
import type { Operative } from "@/lib/types"
import { Navigation } from "@/components/navigation"
import { SiteManagement } from "@/components/site-management"
import { ClientManagement } from "@/components/client-management"
import { WorkforceDashboard } from "@/components/workforce-dashboard"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("calendar")
  const [selectedOperative, setSelectedOperative] = useState<Operative | null>(null)
  const [isAddingOperative, setIsAddingOperative] = useState(false)
  const [isEditingOperative, setIsEditingOperative] = useState(false)

  const handleSelectOperative = (operative: Operative | null) => {
    setSelectedOperative(operative)
    setIsAddingOperative(false)
    setIsEditingOperative(false)
  }

  const handleAddOperative = () => {
    setSelectedOperative(null)
    setIsAddingOperative(true)
    setIsEditingOperative(false)
  }

  const handleBackToList = () => {
    setSelectedOperative(null)
    setIsAddingOperative(false)
    setIsEditingOperative(false)
    // Force refresh of the list by triggering a storage event
    window.dispatchEvent(new Event("storage"))
  }

  const handleEditOperative = () => {
    setIsEditingOperative(true)
  }

  const handleSaveOperative = (operative: Operative) => {
    setSelectedOperative(operative)
    setIsAddingOperative(false)
    setIsEditingOperative(false)
    // Force refresh of the list
    window.dispatchEvent(new Event("storage"))
  }

  const handleCancelEdit = () => {
    setIsEditingOperative(false)
    if (!selectedOperative) {
      setIsAddingOperative(false)
    }
  }

  const renderOperatives = () => {
    if (!selectedOperative && !isAddingOperative && !isEditingOperative) {
      return (
        <OperativeList
          onSelectOperative={handleSelectOperative}
          onAddOperative={handleAddOperative}
        />
      )
    }
    if (isAddingOperative || isEditingOperative) {
      return (
        <OperativeForm
          operative={isEditingOperative ? selectedOperative || undefined : undefined}
          onSave={handleSaveOperative}
          onCancel={handleCancelEdit}
        />
      )
    }
    return (
      selectedOperative && (
        <OperativeCard
          operative={selectedOperative}
          onEdit={handleEditOperative}
          onBack={handleBackToList}
        />
      )
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return <CalendarView />
      case "operatives":
        return renderOperatives()
      case "sites":
        return <SiteManagement />
      case "clients":
        return <ClientManagement />
      case "dashboard":
        return <WorkforceDashboard />
      default:
        return <CalendarView />
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="container mx-auto px-4 py-8">{renderContent()}</div>
    </main>
  )
}
