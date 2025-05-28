import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { subWeeks } from 'npm:date-fns@3.3.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Calculate the date 1 week ago
    const oneWeekAgo = subWeeks(new Date(), 1);

    // Delete appointments older than 1 week
    const { error } = await supabase
      .from('appointments')
      .delete()
      .lt('appointment_date', oneWeekAgo.toISOString());

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: 'Old appointments cleaned successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});