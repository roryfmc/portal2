"use client"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Building2, BarChart3, Calculator, HardHat } from "lucide-react"

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "operatives", label: "Operatives", icon: HardHat },
    { id: "sites", label: "Sites", icon: Building2 },
    { id: "clients", label: "Clients", icon: Users },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "timesheet", label: "Timesheet", icon: Calculator},
  ]

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 py-4">
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">DKF Application</span>
          </div>

          <div className="flex items-center gap-2 ml-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => onTabChange(tab.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
