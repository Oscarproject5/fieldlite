import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwilioService } from '@/lib/twilio/service'
import { rateLimit, RateLimitPresets, getRateLimitHeaders } from '@/lib/security/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    // Apply rate limiting per tenant to prevent toll fraud and spam
    const rateLimitResult = await rateLimit(RateLimitPresets.SMS_SEND(profile.tenant_id))
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, 10)
        }
      )
    }

    const body = await request.json()
    const { to, message, contactId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Must be in E.164 format (e.g., +12345678900)' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length > 1600) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1600 characters.' },
        { status: 400 }
      )
    }

    // Initialize Twilio service
    const twilioService = new TwilioService(profile.tenant_id)

    // Initialize the service (this loads the configuration)
    const initialized = await twilioService.initialize()
    if (!initialized) {
      return NextResponse.json(
        { error: 'Twilio is not configured. Please configure it in settings.' },
        { status: 400 }
      )
    }

    // Get Twilio configuration
    const config = await twilioService.getConfiguration()
    if (!config) {
      return NextResponse.json(
        { error: 'Unable to load Twilio configuration.' },
        { status: 400 }
      )
    }

    // Send the SMS
    const smsResult = await twilioService.sendSMS({
      to,
      body: message,
      contactId: contactId || null
    })

    if (!smsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: smsResult.error || 'Failed to send SMS'
        },
        { status: 400 }
      )
    }

    // Save message to database
    await supabase.from('messages').insert({
      tenant_id: profile.tenant_id,
      direction: 'outbound',
      channel: 'sms',
      from_address: config.phone_number,
      to_address: to,
      body: message,
      related_type: contactId ? 'contact' : null,
      related_id: contactId || null,
      sent_at: new Date().toISOString(),
      delivered_at: smsResult.message.status === 'sent' ? new Date().toISOString() : null,
      user_id: user.id
    })

    return NextResponse.json({
      success: true,
      messageSid: smsResult.message.sid,
      to: smsResult.message.to,
      from: smsResult.message.from,
      status: smsResult.message.status,
      message: 'SMS sent successfully'
    })

  } catch (error: any) {
    console.error('Send SMS error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send SMS'
      },
      { status: 500 }
    )
  }
}