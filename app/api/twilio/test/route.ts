import { NextRequest, NextResponse } from 'next/server';
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

    // Simple validation - just check format
    const isValidAccountSid = accountSid.startsWith('AC') && accountSid.length === 34;
    const isValidAuthToken = authToken.length === 32;

    if (isValidAccountSid && isValidAuthToken) {
      // For testing purposes, we'll consider the credentials valid if they match the format
      // In production, you'd make an actual API call to Twilio to verify

      // Get any existing phone numbers from the database
      const { data: config } = await supabase
        .from('twilio_configurations')
        .select('phone_number')
        .eq('tenant_id', profile.tenant_id)
        .single();

      return NextResponse.json({
        valid: true,
        phoneNumbers: config?.phone_number ? [config.phone_number] : []
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: 'Invalid credentials format. Account SID should start with AC and be 34 characters. Auth Token should be 32 characters.'
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