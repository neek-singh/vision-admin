import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSubscriptions() {
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error checking subscriptions:', error);
  } else {
    console.log('Total push subscriptions:', count);
  }
}

checkSubscriptions();
