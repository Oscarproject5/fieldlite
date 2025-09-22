import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 }
      );
    }

    // Get user's tenant and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: 'No tenant found for user' },
        { status: 400 }
      );
    }

    // Only owners and managers can configure Twilio
    if (profile.role !== 'owner' && profile.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and managers can configure Twilio.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      accountSid,
      authToken,
      phoneNumber,
      phoneNumberSid,
      forwardingNumber,
      updateForwardingOnly
    } = body;

    // If only updating forwarding number
    if (updateForwardingOnly) {
      if (!forwardingNumber) {
        return NextResponse.json(
          { error: 'Forwarding number is required' },
          { status: 400 }
        );
      }

      // Check if a configuration exists
      const { data: existingConfig, error: fetchError } = await supabase
        .from('twilio_configurations')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (fetchError || !existingConfig) {
        return NextResponse.json(
          { error: 'Please complete the Twilio setup first before configuring forwarding number' },
          { status: 400 }
        );
      }

      // Update only the forwarding number
      const { error: updateError } = await supabase
        .from('twilio_configurations')
        .update({
          forwarding_number: forwardingNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || 'Failed to update forwarding number' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Forwarding number updated successfully'
      });
    }

    // For full configuration update
    if (!accountSid || !authToken || !phoneNumber || !phoneNumberSid) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Encrypt the auth token
    const encryptedAuthToken = encrypt(authToken);

    // Check if configuration exists
    const { data: existingConfig } = await supabase
      .from('twilio_configurations')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .single();

    let result;

    if (existingConfig) {
      // Update existing configuration
      result = await supabase
        .from('twilio_configurations')
        .update({
          account_sid: accountSid,
          auth_token: encryptedAuthToken,
          phone_number: phoneNumber,
          phone_number_sid: phoneNumberSid,
          forwarding_number: forwardingNumber,
          is_active: true,
          is_verified: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          webhook_base_url: process.env.NEXT_PUBLIC_APP_URL
        })
        .eq('id', existingConfig.id);
    } else {
      // Create new configuration
      result = await supabase
        .from('twilio_configurations')
        .insert({
          tenant_id: profile.tenant_id,
          account_sid: accountSid,
          auth_token: encryptedAuthToken,
          phone_number: phoneNumber,
          phone_number_sid: phoneNumberSid,
          forwarding_number: forwardingNumber,
          is_active: true,
          is_verified: true,
          verified_at: new Date().toISOString(),
          webhook_base_url: process.env.NEXT_PUBLIC_APP_URL
        });
    }

    if (result.error) {
      console.error('Failed to save Twilio configuration:', result.error);
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Twilio configuration saved successfully'
    });
  } catch (error: any) {
    console.error('Twilio configure error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to configure Twilio' },
      { status: 500 }
    );
  }
}