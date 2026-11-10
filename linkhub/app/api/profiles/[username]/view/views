import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role so it can insert freely
);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    // 1. Find the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_published')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.is_published) {
      return NextResponse.json({ error: 'Profile is not published' }, { status: 403 });
    }

    // 2. Insert a page view → the trigger will automatically increase total_views
    const { error: insertError } = await supabase
      .from('page_views')
      .insert({
        profile_id: profile.id,
        // You can add more data later (device, country, etc.)
      });

    if (insertError) {
      console.error('Error inserting page view:', insertError);
      return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}