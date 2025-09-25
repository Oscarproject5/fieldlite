import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to test Twilio credentials.' },
    { status: 405 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

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

    // Test credentials using fetch instead of Twilio SDK
    try {
      const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      // Test against Twilio API directly
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        // Get phone numbers
        const numbersResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
          {
            headers: {
              'Authorization': `Basic ${authString}`,
              'Accept': 'application/json'
            }
          }
        );

        let phoneNumbers: any[] = [];
        if (numbersResponse.ok) {
          const numbersData = await numbersResponse.json();
          phoneNumbers = (numbersData.incoming_phone_numbers || []).map((number: any) => ({
            sid: number.sid,
            phoneNumber: number.phone_number,
            friendlyName: number.friendly_name
          }));
        }

        return NextResponse.json({
          valid: true,
          phoneNumbers
        });
      } else if (response.status === 401) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid Account SID or Auth Token'
        });
      } else {
        const errorText = await response.text();
        return NextResponse.json({
          valid: false,
          error: `Twilio API error: ${response.status}`
        });
      }
    } catch (fetchError: any) {
      console.error('Twilio API fetch error:', fetchError);
      return NextResponse.json({
        valid: false,
        error: 'Failed to connect to Twilio API'
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