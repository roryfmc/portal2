"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, type File, X, Check, AlertCircle } from "lucide-react"

interface DocumentUploadProps {
  onUpload: (file: File, url: string) => void
  existingUrl?: string
  accept?: string
  maxSize?: number // in MB
  label?: string
}

export function DocumentUpload({
  onUpload,
  existingUrl,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxSize = 10,
  label = "Upload Document",
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(
    existingUrl ? { name: "Existing Document", url: existingUrl } : null,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const allowedTypes = accept.split(",").map((type) => type.trim())
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    const isValidType = allowedTypes.some((type) => {
      if (type.startsWith(".")) {
        return type === fileExtension
      }
      return file.type.startsWith(type.replace("*", ""))
    })

    if (!isValidType) {
      return `File type not supported. Allowed types: ${accept}`
    }

    return null
  }

  const simulateUpload = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsUploading(false)
            // Create a mock URL for the uploaded file
            const mockUrl = `blob:${window.location.origin}/${Date.now()}-${file.name}`
            resolve(mockUrl)
            return 100
          }
          return prev + 10
        })
      }, 200)
    })
  }

  const handleFileSelect = async (file: File) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      const url = await simulateUpload(file)
      setUploadedFile({ name: file.name, url })
      onUpload(file, url)
    } catch (err) {
      setError("Upload failed. Please try again.")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDownload = () => {
    if (uploadedFile?.url) {
      // In a real app, this would download the actual file
      window.open(uploadedFile.url, "_blank")
    }
  }

  if (uploadedFile && !isUploading) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{uploadedFile.name}</p>
                <p className="text-sm text-green-700">Document uploaded successfully</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
                className="text-red-600 hover:text-red-700 bg-transparent"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : error
              ? "border-red-300 bg-red-50"
              : "border-border hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8">
          {isUploading ? (
            <div className="text-center space-y-4">
              <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                <Upload className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-medium mb-2">Uploading document...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">{uploadProgress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className={`p-3 rounded-full w-fit mx-auto ${error ? "bg-red-100" : "bg-primary/10"}`}>
                {error ? <AlertCircle className="w-8 h-8 text-red-600" /> : <Upload className="w-8 h-8 text-primary" />}
              </div>

              <div>
                <p className="font-medium mb-2">{error ? "Upload Error" : label}</p>
                {error ? (
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">Drag and drop your file here, or click to browse</p>
                )}

                <Button
                  variant={error ? "outline" : "default"}
                  onClick={() => fileInputRef.current?.click()}
                  className={error ? "border-red-300 text-red-600 hover:bg-red-50" : ""}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {error ? "Try Again" : "Choose File"}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported formats: {accept.replace(/\./g, "").toUpperCase()}</p>
                <p>Maximum file size: {maxSize}MB</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
