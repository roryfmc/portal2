"use client"

import { useState } from "react"
import { CalendarView } from "@/components/calendar-view"
import { OperativeManagement } from "@/components/operative-management"
import { SiteManagement } from "@/components/site-management"
import { ClientManagement } from "@/components/client-management"
import { WorkforceDashboard } from "@/components/workforce-dashboard"
import { EmailNotifications } from "@/components/email-notifications"
import { Navigation } from "@/components/navigation"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("calendar")

  const renderContent = () => {
    switch (activeTab) {
      case "calendar":
        return <CalendarView />
      case "operatives":
        return <OperativeManagement />
      case "sites":
        return <SiteManagement />
      case "clients":
        return <ClientManagement />
      case "dashboard":
        return <WorkforceDashboard />
      case "notifications":
        return <EmailNotifications />
      default:
        return <CalendarView />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="container mx-auto px-4 py-8">{renderContent()}</div>
    </div>
  )
}
