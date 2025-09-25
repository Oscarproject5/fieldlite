import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // For testing, allow without auth but limit results
      const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      return NextResponse.json({
        authenticated: false,
        calls: calls || [],
        message: 'Showing recent calls (unauthenticated)'
      });
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

    // Get recent calls for this tenant
    const { data: calls, error } = await supabase
      .from('calls')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching calls:', error);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    return NextResponse.json({
      authenticated: true,
      tenant_id: profile.tenant_id,
      total_calls: calls?.length || 0,
      calls: calls || [],
      message: calls?.length ? 'Recent calls found' : 'No calls found yet. Make a test call to your Twilio number!'
    });

  } catch (error: any) {
    console.error('Recent calls error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recent calls' },
      { status: 500 }
    );
  }
}