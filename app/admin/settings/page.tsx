'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTheme } from '@/contexts/theme-context'
import { 
  Palette, 
  Globe, 
  Shield, 
  Plug, 
  BookOpen, 
  Lock, 
  Database, 
  FileText, 
  Settings,
  Save,
  Upload,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

interface Settings {
  branding: {
    logo: string | null
    primaryColor: string
    secondaryColor: string
    fontFamily: string
  }
  localization: {
    defaultTimezone: string
    defaultLanguage: string
    dateFormat: string
    timeFormat: '12h' | '24h'
  }
  course: {
    defaultPassMark: number
    defaultQuizAttempts: number
    defaultQuizRandomize: boolean
    defaultCertificateExpiryDays: number | null
    defaultAssignmentReminders: boolean
  }
  security: {
    sessionTimeoutMinutes: number
    require2FA: boolean
    passwordMinLength: number
    passwordRequireUppercase: boolean
    passwordRequireLowercase: boolean
    passwordRequireNumbers: boolean
    passwordRequireSpecialChars: boolean
  }
  integrations: {
    email: {
      provider: string
      smtpHost: string
      smtpPort: number
      smtpUser: string
      smtpPassword: string
      smtpSecure: boolean
      fromEmail: string
      fromName: string
    }
    sso: {
      enabled: boolean
      provider: 'google' | 'microsoft' | 'okta'
      clientId: string
      clientSecret: string
    }
  }
  dataRetention: {
    userDataRetentionDays: number
    progressLogRetentionDays: number
    auditLogRetentionDays: number
    anonymizeAnalytics: boolean
  }
  maintenance: {
    enabled: boolean
    message: string
    scheduledStart: string | null
    scheduledEnd: string | null
  }
  legal: {
    termsOfServiceUrl: string | null
    privacyPolicyUrl: string | null
    requireAcceptanceOnLogin: boolean
  }
}

export default function SettingsPage() {
  const { getThemeColor } = useTheme()
  const [activeTab, setActiveTab] = useState('branding')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get theme color for focus rings
  const themeColor = getThemeColor()
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  
  // Debounce timers for input fields
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    fetchSettings()
    
    // Cleanup debounce timers on unmount
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer))
    }
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings(data.settings)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: any, immediate = false) => {
    // If immediate, save right away (for checkboxes, selects, etc.)
    // Otherwise, debounce for text inputs
    if (!immediate) {
      // Clear existing timer for this key
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key])
      }
      
      // Update local state immediately for responsive UI
      if (settings) {
        const keys = key.split('.')
        const newSettings = { ...settings }
        let current: any = newSettings
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value
        setSettings(newSettings)
      }
      
      // Debounce the API call
      debounceTimers.current[key] = setTimeout(async () => {
        await saveSetting(key, value)
        delete debounceTimers.current[key]
      }, 1000) // 1 second debounce
      
      return
    }
    
    // Immediate save
    await saveSetting(key, value)
  }

  const saveSetting = async (key: string, value: any) => {
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })

      if (!res.ok) {
        throw new Error('Failed to update setting')
      }

      // Update local state
      if (settings) {
        const keys = key.split('.')
        const newSettings = { ...settings }
        let current: any = newSettings
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value
        setSettings(newSettings)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
      // If branding settings were updated, trigger a refresh immediately
      if (key.startsWith('branding.')) {
        // Set a flag in localStorage to trigger refresh in other tabs
        localStorage.setItem('brandingUpdated', Date.now().toString())
        // Also trigger a custom event for same-tab updates
        window.dispatchEvent(new Event('brandingUpdated'))
        // Trigger a refresh after a short delay to ensure database is updated
        setTimeout(() => {
          window.dispatchEvent(new Event('brandingUpdated'))
        }, 500)
      }
    } catch (err: any) {
      console.error('Error updating setting:', err)
      setError(err.message || 'Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnectionClick = () => {
    // Set default test email to fromEmail if available
    if (settings?.integrations.email.fromEmail) {
      setTestEmail(settings.integrations.email.fromEmail)
    }
    setShowTestEmailDialog(true)
  }

  const testSmtpConnection = async () => {
    if (!settings || !testEmail) {
      setError('Please enter a test email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setTestingConnection(true)
    setConnectionTestResult(null)
    setError(null)

    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: settings.integrations.email.smtpHost,
          smtpPort: settings.integrations.email.smtpPort,
          smtpUser: settings.integrations.email.smtpUser,
          smtpPassword: settings.integrations.email.smtpPassword,
          smtpSecure: settings.integrations.email.smtpSecure,
          fromEmail: settings.integrations.email.fromEmail,
          testEmail: testEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Connection test failed')
      }

      setConnectionTestResult({
        success: data.success,
        message: data.message || 'Connection successful!',
      })
      
      // Close dialog on success
      setShowTestEmailDialog(false)
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        message: err.message || 'Failed to test connection',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      await updateSetting('branding.logo', data.file.url)
    } catch (err) {
      console.error('Error uploading logo:', err)
      setError('Failed to upload logo')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load settings</p>
        <Button onClick={fetchSettings} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800">Settings saved successfully</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 gap-2">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden lg:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden lg:inline">Localization</span>
          </TabsTrigger>
          <TabsTrigger value="course" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden lg:inline">Course Policies</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden lg:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden lg:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="dataRetention" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden lg:inline">Data Retention</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">Legal</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">Maintenance</span>
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your organization's logo, colors, and fonts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="logo">Company Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {settings.branding.logo && (
                    <img src={settings.branding.logo} alt="Logo" className="h-20 w-auto rounded-lg" />
                  )}
                  <div>
                    <Input
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {settings.branding.logo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      type="color"
                      id="primaryColor"
                      value={settings.branding.primaryColor}
                      onChange={(e) => updateSetting('branding.primaryColor', e.target.value, true)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={settings.branding.primaryColor}
                      onChange={(e) => updateSetting('branding.primaryColor', e.target.value, false)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      type="color"
                      id="secondaryColor"
                      value={settings.branding.secondaryColor}
                      onChange={(e) => updateSetting('branding.secondaryColor', e.target.value, true)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={settings.branding.secondaryColor}
                      onChange={(e) => updateSetting('branding.secondaryColor', e.target.value, false)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                  <select
                    id="fontFamily"
                    value={settings.branding.fontFamily}
                    onChange={(e) => updateSetting('branding.fontFamily', e.target.value, true)}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization Tab */}
        <TabsContent value="localization" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Localization & Time Zones</CardTitle>
              <CardDescription>Configure default language, timezone, and date formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultTimezone">Default Timezone</Label>
                  <select
                    id="defaultTimezone"
                    value={settings.localization.defaultTimezone}
                    onChange={(e) => updateSetting('localization.defaultTimezone', e.target.value, true)}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  >
                    <option value="Africa/Accra">Africa/Accra (GMT)</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <select
                    id="defaultLanguage"
                    value={settings.localization.defaultLanguage}
                    onChange={(e) => updateSetting('localization.defaultLanguage', e.target.value, true)}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <select
                    id="dateFormat"
                    value={settings.localization.dateFormat}
                    onChange={(e) => updateSetting('localization.dateFormat', e.target.value, true)}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <select
                    id="timeFormat"
                    value={settings.localization.timeFormat}
                    onChange={(e) => updateSetting('localization.timeFormat', e.target.value, true)}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Policies Tab */}
        <TabsContent value="course" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Course & Content Policies</CardTitle>
              <CardDescription>Set default values for courses, quizzes, and certificates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultPassMark">Default Pass Mark (%)</Label>
                  <Input
                    type="number"
                    id="defaultPassMark"
                    min="0"
                    max="100"
                    value={settings.course.defaultPassMark}
                    onChange={(e) => updateSetting('course.defaultPassMark', parseInt(e.target.value), false)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="defaultQuizAttempts">Default Quiz Attempts</Label>
                  <Input
                    type="number"
                    id="defaultQuizAttempts"
                    min="1"
                    max="10"
                    value={settings.course.defaultQuizAttempts}
                    onChange={(e) => updateSetting('course.defaultQuizAttempts', parseInt(e.target.value), false)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="defaultCertificateExpiryDays">Default Certificate Expiry (days)</Label>
                  <Input
                    type="number"
                    id="defaultCertificateExpiryDays"
                    min="0"
                    value={settings.course.defaultCertificateExpiryDays || ''}
                    onChange={(e) => updateSetting('course.defaultCertificateExpiryDays', e.target.value ? parseInt(e.target.value) : null, false)}
                    className="mt-2"
                    placeholder="No expiry"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <Label htmlFor="defaultQuizRandomize">Randomize Quiz Questions</Label>
                  <p className="text-sm text-gray-500">Shuffle questions by default</p>
                </div>
                <input
                  type="checkbox"
                  id="defaultQuizRandomize"
                  checked={settings.course.defaultQuizRandomize}
                  onChange={(e) => updateSetting('course.defaultQuizRandomize', e.target.checked, true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <Label htmlFor="defaultAssignmentReminders">Enable Assignment Reminders</Label>
                  <p className="text-sm text-gray-500">Send automatic reminders for assignments</p>
                </div>
                <input
                  type="checkbox"
                  id="defaultAssignmentReminders"
                  checked={settings.course.defaultAssignmentReminders}
                  onChange={(e) => updateSetting('course.defaultAssignmentReminders', e.target.checked, true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure authentication and security policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="sessionTimeoutMinutes">Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  id="sessionTimeoutMinutes"
                  min="15"
                  max="1440"
                  value={settings.security.sessionTimeoutMinutes}
                  onChange={(e) => updateSetting('security.sessionTimeoutMinutes', parseInt(e.target.value), false)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Current: {Math.floor(settings.security.sessionTimeoutMinutes / 60)} hours</p>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <Label htmlFor="require2FA">Require Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">Enforce 2FA for all users</p>
                </div>
                <input
                  type="checkbox"
                  id="require2FA"
                  checked={settings.security.require2FA}
                  onChange={(e) => updateSetting('security.require2FA', e.target.checked, true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-4">Password Policy</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="passwordMinLength">Minimum Length</Label>
                    <Input
                      type="number"
                      id="passwordMinLength"
                      min="6"
                      max="32"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => updateSetting('security.passwordMinLength', parseInt(e.target.value), false)}
                      className="mt-2"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="passwordRequireUppercase">Require Uppercase</Label>
                      <input
                        type="checkbox"
                        id="passwordRequireUppercase"
                        checked={settings.security.passwordRequireUppercase}
                        onChange={(e) => updateSetting('security.passwordRequireUppercase', e.target.checked, true)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="passwordRequireLowercase">Require Lowercase</Label>
                      <input
                        type="checkbox"
                        id="passwordRequireLowercase"
                        checked={settings.security.passwordRequireLowercase}
                        onChange={(e) => updateSetting('security.passwordRequireLowercase', e.target.checked, true)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="passwordRequireNumbers">Require Numbers</Label>
                      <input
                        type="checkbox"
                        id="passwordRequireNumbers"
                        checked={settings.security.passwordRequireNumbers}
                        onChange={(e) => updateSetting('security.passwordRequireNumbers', e.target.checked, true)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="passwordRequireSpecialChars">Require Special Characters</Label>
                      <input
                        type="checkbox"
                        id="passwordRequireSpecialChars"
                        checked={settings.security.passwordRequireSpecialChars}
                        onChange={(e) => updateSetting('security.passwordRequireSpecialChars', e.target.checked, true)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab - Continue in next response due to length */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Configure external service integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-b pb-6">
                <h3 className="font-medium text-gray-900 mb-4">Email (SMTP)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      type="text"
                      id="smtpHost"
                      value={settings.integrations.email.smtpHost}
                      onChange={(e) => {
                        const newEmail = { ...settings.integrations.email, smtpHost: e.target.value }
                        updateSetting('integrations.email', newEmail, false)
                      }}
                      className="mt-2"
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      type="number"
                      id="smtpPort"
                      value={settings.integrations.email.smtpPort}
                      onChange={(e) => {
                        const newEmail = { ...settings.integrations.email, smtpPort: parseInt(e.target.value) || 587 }
                        updateSetting('integrations.email', newEmail, false)
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      type="text"
                      id="smtpUser"
                      value={settings.integrations.email.smtpUser}
                      onChange={(e) => {
                        const newEmail = { ...settings.integrations.email, smtpUser: e.target.value }
                        updateSetting('integrations.email', newEmail, false)
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      type="password"
                      id="smtpPassword"
                      value={settings.integrations.email.smtpPassword === '***' ? '' : settings.integrations.email.smtpPassword}
                      onChange={(e) => {
                        const newEmail = { ...settings.integrations.email, smtpPassword: e.target.value }
                        updateSetting('integrations.email', newEmail, false)
                      }}
                      className="mt-2"
                      placeholder={settings.integrations.email.smtpPassword === '***' ? '••••••••' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      type="email"
                      id="fromEmail"
                      value={settings.integrations.email.fromEmail}
                      onChange={(e) => {
                        const newEmail = { ...settings.integrations.email, fromEmail: e.target.value }
                        updateSetting('integrations.email', newEmail, false)
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      type="text"
                      id="fromName"
                      value={settings.integrations.email.fromName}
                      onChange={(e) => {
                        const newEmail = { ...settings.integrations.email, fromName: e.target.value }
                        updateSetting('integrations.email', newEmail, false)
                      }}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 p-4 border border-gray-200 rounded-lg">
                  <div>
                    <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
                    <p className="text-sm text-gray-500">Enable secure connection</p>
                  </div>
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={settings.integrations.email.smtpSecure}
                    onChange={(e) => {
                      const newEmail = { ...settings.integrations.email, smtpSecure: e.target.checked }
                      updateSetting('integrations.email', newEmail, true)
                    }}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Button 
                    onClick={handleTestConnectionClick} 
                    variant="outline"
                  >
                    Test Connection
                  </Button>
                  {connectionTestResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${
                      connectionTestResult.success 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {connectionTestResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`text-sm ${
                        connectionTestResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {connectionTestResult.message}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Single Sign-On (SSO)</h3>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-4">
                  <div>
                    <Label htmlFor="ssoEnabled">Enable SSO</Label>
                    <p className="text-sm text-gray-500">Allow users to sign in with external providers</p>
                  </div>
                  <input
                    type="checkbox"
                    id="ssoEnabled"
                    checked={settings.integrations.sso.enabled}
                    onChange={(e) => {
                      const newSso = { ...settings.integrations.sso, enabled: e.target.checked }
                      updateSetting('integrations.sso', newSso, true)
                    }}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                </div>
                {settings.integrations.sso.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ssoProvider">SSO Provider</Label>
                      <select
                        id="ssoProvider"
                        value={settings.integrations.sso.provider}
                        onChange={(e) => {
                          const newSso = { ...settings.integrations.sso, provider: e.target.value as any }
                          updateSetting('integrations.sso', newSso, true)
                        }}
                        className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                      >
                        <option value="google">Google Workspace</option>
                        <option value="microsoft">Microsoft Azure AD</option>
                        <option value="okta">Okta</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="ssoClientId">Client ID</Label>
                      <Input
                        type="text"
                        id="ssoClientId"
                        value={settings.integrations.sso.clientId}
                        onChange={(e) => {
                          const newSso = { ...settings.integrations.sso, clientId: e.target.value }
                          updateSetting('integrations.sso', newSso, false)
                        }}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ssoClientSecret">Client Secret</Label>
                      <Input
                        type="password"
                        id="ssoClientSecret"
                        value={settings.integrations.sso.clientSecret === '***' ? '' : settings.integrations.sso.clientSecret}
                        onChange={(e) => {
                          const newSso = { ...settings.integrations.sso, clientSecret: e.target.value }
                          updateSetting('integrations.sso', newSso, false)
                        }}
                        className="mt-2"
                        placeholder={settings.integrations.sso.clientSecret === '***' ? '••••••••' : ''}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Retention Tab */}
        <TabsContent value="dataRetention" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Data Retention & Privacy</CardTitle>
              <CardDescription>Configure data retention policies and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="userDataRetentionDays">User Data Retention (days)</Label>
                  <Input
                    type="number"
                    id="userDataRetentionDays"
                    min="90"
                    value={settings.dataRetention.userDataRetentionDays}
                    onChange={(e) => updateSetting('dataRetention.userDataRetentionDays', parseInt(e.target.value), false)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {Math.floor(settings.dataRetention.userDataRetentionDays / 365)} years</p>
                </div>
                <div>
                  <Label htmlFor="progressLogRetentionDays">Progress Log Retention (days)</Label>
                  <Input
                    type="number"
                    id="progressLogRetentionDays"
                    min="90"
                    value={settings.dataRetention.progressLogRetentionDays}
                    onChange={(e) => updateSetting('dataRetention.progressLogRetentionDays', parseInt(e.target.value), false)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {Math.floor(settings.dataRetention.progressLogRetentionDays / 365)} years</p>
                </div>
                <div>
                  <Label htmlFor="auditLogRetentionDays">Audit Log Retention (days)</Label>
                  <Input
                    type="number"
                    id="auditLogRetentionDays"
                    min="90"
                    value={settings.dataRetention.auditLogRetentionDays}
                    onChange={(e) => updateSetting('dataRetention.auditLogRetentionDays', parseInt(e.target.value), false)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {Math.floor(settings.dataRetention.auditLogRetentionDays / 365)} years</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <Label htmlFor="anonymizeAnalytics">Anonymize Analytics Data</Label>
                  <p className="text-sm text-gray-500">Remove personally identifiable information from analytics</p>
                </div>
                <input
                  type="checkbox"
                  id="anonymizeAnalytics"
                  checked={settings.dataRetention.anonymizeAnalytics}
                  onChange={(e) => updateSetting('dataRetention.anonymizeAnalytics', e.target.checked, true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Tab */}
        <TabsContent value="legal" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Legal & Compliance</CardTitle>
              <CardDescription>Configure terms of service and privacy policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="termsOfServiceUrl">Terms of Service URL</Label>
                <Input
                  type="url"
                  id="termsOfServiceUrl"
                  value={settings.legal.termsOfServiceUrl || ''}
                  onChange={(e) => updateSetting('legal.termsOfServiceUrl', e.target.value || null, false)}
                  className="mt-2"
                  placeholder="https://example.com/terms"
                />
              </div>
              <div>
                <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                <Input
                  type="url"
                  id="privacyPolicyUrl"
                  value={settings.legal.privacyPolicyUrl || ''}
                  onChange={(e) => updateSetting('legal.privacyPolicyUrl', e.target.value || null, false)}
                  className="mt-2"
                  placeholder="https://example.com/privacy"
                />
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <Label htmlFor="requireAcceptanceOnLogin">Require Acceptance on Login</Label>
                  <p className="text-sm text-gray-500">Users must accept terms and privacy policy on first login</p>
                </div>
                <input
                  type="checkbox"
                  id="requireAcceptanceOnLogin"
                  checked={settings.legal.requireAcceptanceOnLogin}
                  onChange={(e) => updateSetting('legal.requireAcceptanceOnLogin', e.target.checked, true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Maintenance & System Status</CardTitle>
              <CardDescription>Configure maintenance mode and system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <Label htmlFor="maintenanceEnabled">Enable Maintenance Mode</Label>
                  <p className="text-sm text-gray-500">Show maintenance message to all users</p>
                </div>
                <input
                  type="checkbox"
                  id="maintenanceEnabled"
                  checked={settings.maintenance.enabled}
                  onChange={(e) => updateSetting('maintenance.enabled', e.target.checked, true)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
              </div>
              {settings.maintenance.enabled && (
                <>
                  <div>
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea
                      id="maintenanceMessage"
                      value={settings.maintenance.message}
                      onChange={(e) => updateSetting('maintenance.message', e.target.value, false)}
                      className="mt-2"
                      placeholder="We're currently performing maintenance. Please check back soon."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduledStart">Scheduled Start</Label>
                      <Input
                        type="datetime-local"
                        id="scheduledStart"
                        value={settings.maintenance.scheduledStart || ''}
                        onChange={(e) => updateSetting('maintenance.scheduledStart', e.target.value || null, true)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scheduledEnd">Scheduled End</Label>
                      <Input
                        type="datetime-local"
                        id="scheduledEnd"
                        value={settings.maintenance.scheduledEnd || ''}
                        onChange={(e) => updateSetting('maintenance.scheduledEnd', e.target.value || null, true)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Email Dialog */}
      <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test SMTP Connection</DialogTitle>
            <DialogDescription>
              Enter an email address to send a test email and verify your SMTP configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="mt-2"
                disabled={testingConnection}
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTestEmailDialog(false)
                setTestEmail('')
                setError(null)
              }}
              disabled={testingConnection}
            >
              Cancel
            </Button>
            <Button
              onClick={testSmtpConnection}
              disabled={testingConnection || !testEmail}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
