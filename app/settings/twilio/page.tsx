'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, Check, X, Loader2, AlertCircle, PhoneCall, Settings, Key } from 'lucide-react'
import { TestConfiguration } from '@/components/twilio/test-configuration'

export default function TwilioSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    phoneNumberSid: '',
    forwardingNumber: ''
  })
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [existingConfig, setExistingConfig] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadExistingConfig()
  }, [])

  const loadExistingConfig = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (profile?.tenant_id) {
        const { data: twilioConfig } = await supabase
          .from('twilio_configurations')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .single()

        if (twilioConfig) {
          setExistingConfig(twilioConfig)
          setConfig({
            accountSid: twilioConfig.account_sid,
            authToken: '', // Don't show existing token
            phoneNumber: twilioConfig.phone_number || '',
            phoneNumberSid: twilioConfig.phone_number_sid || '',
            forwardingNumber: twilioConfig.forwarding_number || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/twilio/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: config.accountSid,
          authToken: config.authToken
        })
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setTestResult({ success: true, message: 'Connection successful!' })

        // Load available phone numbers
        if (data.phoneNumbers) {
          setPhoneNumbers(data.phoneNumbers)
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed. Please check your credentials.'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please try again.'
      })
    } finally {
      setTesting(false)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)

    try {
      const response = await fetch('/api/twilio/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Configuration saved successfully!'
        })
        await loadExistingConfig()
      } else {
        const data = await response.json()
        setTestResult({
          success: false,
          message: data.error || 'Failed to save configuration'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to save configuration. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Phone className="h-8 w-8" />
          Twilio Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Connect your Twilio account to enable call tracking and SMS features
        </p>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">
            <Key className="h-4 w-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="test">
            <PhoneCall className="h-4 w-4 mr-2" />
            Test
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Account Credentials</CardTitle>
              <CardDescription>
                You can find these in your Twilio Console at console.twilio.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingConfig?.is_active && (
                <Alert className="mb-4">
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Twilio is currently configured and active
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  type="text"
                  value={config.accountSid}
                  onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  value={config.authToken}
                  onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                  placeholder={existingConfig ? '••••••••••••••••' : 'Enter your auth token'}
                />
                <p className="text-sm text-muted-foreground">
                  Your auth token is encrypted and stored securely
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={testConnection}
                  disabled={!config.accountSid || !config.authToken || testing}
                  variant="secondary"
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              {phoneNumbers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Select Phone Number</Label>
                  <select
                    id="phoneNumber"
                    className="w-full p-2 border rounded-md"
                    value={config.phoneNumberSid}
                    onChange={(e) => {
                      const selected = phoneNumbers.find(p => p.sid === e.target.value)
                      setConfig({
                        ...config,
                        phoneNumber: selected?.phoneNumber || '',
                        phoneNumberSid: e.target.value
                      })
                    }}
                  >
                    <option value="">Select a phone number...</option>
                    {phoneNumbers.map((phone) => (
                      <option key={phone.sid} value={phone.sid}>
                        {phone.friendlyName || phone.phoneNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config.phoneNumberSid && (
                <Button
                  onClick={saveConfiguration}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">1. Sign up for Twilio</h3>
                <p className="text-sm text-muted-foreground">
                  Create a free account at twilio.com. You'll get $15 in free credits to start.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">2. Get a Phone Number</h3>
                <p className="text-sm text-muted-foreground">
                  Purchase a phone number in your Twilio console (starts at $1/month).
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">3. Find Your Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Your Account SID and Auth Token are in the Twilio Console dashboard.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">4. Configure Here</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials above and select your phone number.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <TestConfiguration
            isConfigured={!!existingConfig?.is_active}
            phoneNumber={existingConfig?.phone_number}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Call Forwarding Settings</CardTitle>
              <CardDescription>
                Configure where incoming calls should be forwarded
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forwardingNumber">Forwarding Phone Number</Label>
                <Input
                  id="forwardingNumber"
                  type="tel"
                  value={config.forwardingNumber}
                  onChange={(e) => setConfig({ ...config, forwardingNumber: e.target.value })}
                  placeholder="+1234567890"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the phone number where incoming calls should be forwarded. Include country code (e.g., +1 for US).
                </p>
              </div>

              <Button
                onClick={async () => {
                  setSaving(true)
                  try {
                    const response = await fetch('/api/twilio/configure', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...config,
                        updateForwardingOnly: true
                      })
                    })

                    if (response.ok) {
                      setTestResult({
                        success: true,
                        message: 'Forwarding number updated successfully!'
                      })
                      await loadExistingConfig()
                    } else {
                      const data = await response.json()
                      setTestResult({
                        success: false,
                        message: data.error || 'Failed to update forwarding number'
                      })
                    }
                  } catch (error) {
                    setTestResult({
                      success: false,
                      message: 'Failed to update forwarding number. Please try again.'
                    })
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={!config.forwardingNumber || saving}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Forwarding Number
              </Button>

              {testResult && (
                <Alert variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Additional call routing and recording options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">More advanced settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  )
}