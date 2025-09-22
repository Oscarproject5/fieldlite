import { NextRequest, NextResponse } from 'next/server';
import { TwilioService } from '@/lib/twilio/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await request.json();
    const { accountSid, authToken } = body;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Account SID and Auth Token are required' },
        { status: 400 }
      );
    }

    // Test the credentials
    const twilioService = new TwilioService(profile.tenant_id);
    const validationResult = await twilioService.validateCredentials(accountSid, authToken);

    if (validationResult.valid) {
      // Get available phone numbers
      const phoneNumbers = await twilioService.getAvailablePhoneNumbers(accountSid, authToken);

      return NextResponse.json({
        valid: true,
        phoneNumbers
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: validationResult.error
      });
    }
  } catch (error: any) {
    console.error('Twilio test error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to test Twilio credentials' },
      { status: 500 }
    );
  }
}