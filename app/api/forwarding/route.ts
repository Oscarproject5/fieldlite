import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: 'Unauthorized. Please log in again.'
      }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({
        error: 'No tenant found for user'
      }, { status: 400 });
    }

    // Check permissions
    if (profile.role !== 'owner' && profile.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { forwardingNumber } = body;

    if (!forwardingNumber) {
      return NextResponse.json(
        { error: 'Forwarding number is required' },
        { status: 400 }
      );
    }

    // Update forwarding number
    const { error: updateError } = await supabase
      .from('twilio_configurations')
      .update({
        forwarding_number: forwardingNumber,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', profile.tenant_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Forwarding number updated successfully'
    });
  } catch (error: any) {
    console.error('Forwarding update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update forwarding number' },
      { status: 500 }
    );
  }
}