'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  PhoneCall,
  PhoneOutgoing,
  PhoneIncoming,
  Send,
  Webhook,
  Copy
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TestConfigurationProps {
  isConfigured: boolean
  phoneNumber?: string
}

export function TestConfiguration({ isConfigured, phoneNumber }: TestConfigurationProps) {
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from FieldLite CRM.')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    type: 'call' | 'sms' | 'webhook'
    success: boolean
    message: string
    details?: any
  } | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')

  const supabase = createClient()

  const makeTestCall = async () => {
    if (!testPhoneNumber) {
      setTestResult({
        type: 'call',
        success: false,
        message: 'Please enter a phone number to test'
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/twilio/voice/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhoneNumber,
          message: 'This is a test call from FieldLite CRM. Press any key to end this call.'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult({
          type: 'call',
          success: true,
          message: 'Test call initiated successfully!',
          details: {
            callSid: data.callSid,
            to: data.to,
            from: data.from
          }
        })
      } else {
        setTestResult({
          type: 'call',
          success: false,
          message: data.error || 'Failed to initiate test call'
        })
      }
    } catch (error: any) {
      setTestResult({
        type: 'call',
        success: false,
        message: error.message || 'An error occurred while making the test call'
      })
    } finally {
      setTesting(false)
    }
  }

  const testWebhook = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      // Get the current tenant ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTestResult({
          type: 'webhook',
          success: false,
          message: 'Not authenticated'
        })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) {
        setTestResult({
          type: 'webhook',
          success: false,
          message: 'No tenant found'
        })
        return
      }

      // Generate webhook URLs dynamically based on current domain
      const baseUrl = window.location.origin

      const voiceWebhookUrl = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/voice`
      const statusWebhookUrl = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/status`

      setWebhookUrl(voiceWebhookUrl)

      // Test the webhook endpoint
      const response = await fetch('/api/twilio/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: profile.tenant_id,
          testType: 'voice'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult({
          type: 'webhook',
          success: true,
          message: 'Webhook endpoints are configured and ready!',
          details: {
            voiceWebhook: voiceWebhookUrl,
            statusWebhook: statusWebhookUrl,
            tenantId: profile.tenant_id
          }
        })
      } else {
        setTestResult({
          type: 'webhook',
          success: false,
          message: data.error || 'Failed to test webhook'
        })
      }
    } catch (error: any) {
      setTestResult({
        type: 'webhook',
        success: false,
        message: error.message || 'An error occurred while testing webhooks'
      })
    } finally {
      setTesting(false)
    }
  }

  const sendTestSMS = async () => {
    if (!testPhoneNumber) {
      setTestResult({
        type: 'sms',
        success: false,
        message: 'Please enter a phone number to test'
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/twilio/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhoneNumber,
          message: testMessage
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult({
          type: 'sms',
          success: true,
          message: 'Test SMS sent successfully!',
          details: {
            messageSid: data.messageSid,
            to: data.to,
            from: data.from
          }
        })
      } else {
        setTestResult({
          type: 'sms',
          success: false,
          message: data.error || 'Failed to send test SMS'
        })
      }
    } catch (error: any) {
      setTestResult({
        type: 'sms',
        success: false,
        message: error.message || 'An error occurred while sending the test SMS'
      })
    } finally {
      setTesting(false)
    }
  }

  if (!isConfigured) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Required</AlertTitle>
        <AlertDescription>
          Please configure your Twilio account in the Setup tab before testing.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Your Twilio Integration</CardTitle>
          <CardDescription>
            Make test calls and send test messages to verify your configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {phoneNumber && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Ready to Test</AlertTitle>
              <AlertDescription className="text-green-700">
                Your Twilio number: {phoneNumber}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="test-number">Test Phone Number</Label>
            <Input
              id="test-number"
              type="tel"
              placeholder="+1234567890"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              disabled={testing}
            />
            <p className="text-sm text-gray-500">
              Enter the phone number where you want to receive the test call or SMS
            </p>
          </div>

          <Tabs defaultValue="call" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="call" disabled={testing}>
                <PhoneCall className="mr-2 h-4 w-4" />
                Test Call
              </TabsTrigger>
              <TabsTrigger value="sms" disabled={testing}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Test SMS
              </TabsTrigger>
              <TabsTrigger value="webhook" disabled={testing}>
                <Webhook className="mr-2 h-4 w-4" />
                Webhook
              </TabsTrigger>
            </TabsList>

            <TabsContent value="call" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <PhoneOutgoing className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Outbound Test Call</p>
                        <p className="text-sm text-gray-500">
                          You'll receive a call with a test message
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={makeTestCall}
                      disabled={testing || !testPhoneNumber}
                      className="w-full"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Making Call...
                        </>
                      ) : (
                        <>
                          <Phone className="mr-2 h-4 w-4" />
                          Make Test Call
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-message">Test Message</Label>
                      <Input
                        id="test-message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Enter your test message"
                        disabled={testing}
                      />
                    </div>
                    <Button
                      onClick={sendTestSMS}
                      disabled={testing || !testPhoneNumber || !testMessage}
                      className="w-full"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending SMS...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Test SMS
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Webhook className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Webhook Configuration Test</p>
                        <p className="text-sm text-gray-500">
                          Verify your webhook endpoints are properly configured
                        </p>
                      </div>
                    </div>

                    {webhookUrl && (
                      <div className="p-3 bg-gray-50 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-600">Voice Webhook URL:</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(webhookUrl);
                              setTestResult({
                                type: 'webhook',
                                success: true,
                                message: 'Webhook URL copied to clipboard!'
                              });
                              setTimeout(() => setTestResult(null), 3000);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs font-mono break-all">{webhookUrl}</p>
                      </div>
                    )}

                    <Button
                      onClick={testWebhook}
                      disabled={testing}
                      className="w-full"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing Webhooks...
                        </>
                      ) : (
                        <>
                          <Webhook className="mr-2 h-4 w-4" />
                          Test Webhook Configuration
                        </>
                      )}
                    </Button>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        This will verify that your webhook endpoints are accessible and can receive Twilio callbacks.
                        Make sure your Twilio phone number is configured to use these webhook URLs.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {testResult && (
            <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle className={testResult.success ? 'text-green-900' : 'text-red-900'}>
                {testResult.type === 'call' ? 'Call Test' : testResult.type === 'sms' ? 'SMS Test' : 'Webhook Test'} {testResult.success ? 'Successful' : 'Failed'}
              </AlertTitle>
              <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                {testResult.message}
                {testResult.details && (
                  <div className="mt-2 text-xs">
                    {testResult.type === 'call' && testResult.details.callSid && (
                      <p>Call SID: {testResult.details.callSid}</p>
                    )}
                    {testResult.type === 'sms' && testResult.details.messageSid && (
                      <p>Message SID: {testResult.details.messageSid}</p>
                    )}
                    {testResult.type === 'webhook' && testResult.details && (
                      <>
                        {testResult.details.voiceWebhook && (
                          <div className="mt-2">
                            <p className="font-medium">Voice Webhook:</p>
                            <p className="font-mono text-xs break-all">{testResult.details.voiceWebhook}</p>
                          </div>
                        )}
                        {testResult.details.statusWebhook && (
                          <div className="mt-1">
                            <p className="font-medium">Status Webhook:</p>
                            <p className="font-mono text-xs break-all">{testResult.details.statusWebhook}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Use a real phone number</p>
              <p className="text-gray-500">Make sure to use a number you have access to</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Include country code</p>
              <p className="text-gray-500">Format: +1 for US, +44 for UK, etc.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Check your Twilio balance</p>
              <p className="text-gray-500">Ensure you have credits for testing</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}