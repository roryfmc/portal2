"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Send, Settings, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react"
import {
  getStoredNotifications,
  saveNotification,
  getNotificationSettings,
  saveNotificationSettings,
} from "@/lib/storage"
import type { EmailNotification, NotificationSettings } from "@/lib/types"

export function EmailNotifications() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    interviewConfirmation: true,
    interviewReminder: true,
    candidateUpdates: true,
    recruiterNotifications: true,
    reminderHours: 24,
  })

  useEffect(() => {
    const storedNotifications = getStoredNotifications()
    const storedSettings = getNotificationSettings()
    setNotifications(storedNotifications)
    setSettings(storedSettings)
  }, [])

  const handleSettingsChange = (key: keyof NotificationSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    saveNotificationSettings(newSettings)
  }

  const emailTemplates = {
    interviewConfirmation: {
      subject: "Interview Confirmation - {{candidateName}}",
      body: `Dear {{candidateName}},

Your interview has been scheduled for {{date}} at {{time}}.

Interview Details:
- Position: {{position}}
- Interviewer: {{recruiterName}}
- Type: {{interviewType}}
- Duration: 1 hour
{{meetingLink}}

Please confirm your attendance by replying to this email.

Best regards,
{{companyName}} Recruitment Team`,
    },
    interviewReminder: {
      subject: "Interview Reminder - Tomorrow at {{time}}",
      body: `Dear {{candidateName}},

This is a friendly reminder about your interview scheduled for tomorrow.

Interview Details:
- Date: {{date}}
- Time: {{time}}
- Position: {{position}}
- Interviewer: {{recruiterName}}
{{meetingLink}}

We look forward to speaking with you!

Best regards,
{{companyName}} Recruitment Team`,
    },
    candidateUpdate: {
      subject: "Application Status Update",
      body: `Dear {{candidateName}},

We wanted to update you on the status of your application for the {{position}} role.

Your application status has been updated to: {{status}}

{{additionalMessage}}

Thank you for your interest in joining our team.

Best regards,
{{companyName}} Recruitment Team`,
    },
  }

  const mockSendEmail = (type: string, recipient: string) => {
    const newNotification: EmailNotification = {
      id: Date.now().toString(),
      type: type as EmailNotification["type"],
      recipient,
      subject: emailTemplates[type as keyof typeof emailTemplates]?.subject || "Notification",
      status: "sent",
      sentAt: new Date(),
    }

    saveNotification(newNotification)
    setNotifications((prev) => [newNotification, ...prev])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance mb-2">Email Notifications</h2>
        <p className="text-muted-foreground">Manage email templates and notification settings</p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Interview Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Send confirmation emails when interviews are scheduled
                    </p>
                  </div>
                  <Switch
                    checked={settings.interviewConfirmation}
                    onCheckedChange={(checked) => handleSettingsChange("interviewConfirmation", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Interview Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send reminder emails before interviews</p>
                  </div>
                  <Switch
                    checked={settings.interviewReminder}
                    onCheckedChange={(checked) => handleSettingsChange("interviewReminder", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Candidate Updates</Label>
                    <p className="text-sm text-muted-foreground">Notify candidates of status changes</p>
                  </div>
                  <Switch
                    checked={settings.candidateUpdates}
                    onCheckedChange={(checked) => handleSettingsChange("candidateUpdates", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recruiter Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send notifications to recruiters</p>
                  </div>
                  <Switch
                    checked={settings.recruiterNotifications}
                    onCheckedChange={(checked) => handleSettingsChange("recruiterNotifications", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reminder Time (hours before interview)</Label>
                  <Input
                    type="number"
                    value={settings.reminderHours}
                    onChange={(e) => handleSettingsChange("reminderHours", Number.parseInt(e.target.value) || 24)}
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(emailTemplates).map(([key, template]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Email Template Preview</DialogTitle>
                          <DialogDescription>
                            Preview of the {key.replace(/([A-Z])/g, " $1").toLowerCase()} email template
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Subject:</Label>
                            <p className="text-sm bg-muted p-2 rounded mt-1">{template.subject}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Body:</Label>
                            <pre className="text-sm bg-muted p-4 rounded mt-1 whitespace-pre-wrap font-sans">
                              {template.body}
                            </pre>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Subject:</Label>
                      <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Preview:</Label>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                        {template.body.split("\n")[0]}...
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => mockSendEmail(key, "test@example.com")}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Test Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Email History</span>
                <Badge variant="secondary">{notifications.length} sent</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(notification.status)}
                        <div>
                          <p className="font-medium text-sm">{notification.subject}</p>
                          <p className="text-xs text-muted-foreground">To: {notification.recipient}</p>
                          <p className="text-xs text-muted-foreground capitalize">{notification.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={notification.status === "sent" ? "default" : "secondary"}>
                          {notification.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.sentAt.toLocaleDateString()} {notification.sentAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email notifications sent yet</p>
                    <p className="text-sm">Notifications will appear here when emails are sent</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
