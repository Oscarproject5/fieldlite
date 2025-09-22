import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwilioService } from '@/lib/twilio/service'

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

    const body = await request.json()
    const { to, message } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    // Make the outbound call
    const twiml = `
      <Response>
        <Say voice="alice">${message || 'This is a test call from FieldLite CRM. Press any key to end this call.'}</Say>
        <Pause length="2"/>
        <Say voice="alice">Thank you for testing. Goodbye!</Say>
      </Response>
    `

    const callResult = await twilioService.makeCall({
      to,
      twimlContent: twiml,
      userId: user.id,
      contactId: null // This is a test call, no contact associated
    })

    if (!callResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: callResult.error || 'Failed to make call'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      callSid: callResult.call.sid,
      to: callResult.call.to,
      from: callResult.call.from,
      status: callResult.call.status,
      message: 'Test call initiated successfully'
    })

  } catch (error: any) {
    console.error('Outbound call error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to make outbound call'
      },
      { status: 500 }
    )
  }
}