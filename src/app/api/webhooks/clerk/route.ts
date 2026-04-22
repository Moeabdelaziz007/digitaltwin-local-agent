// ============================================================
// Clerk Webhook — Sync user.created events to PocketBase
// Endpoint: POST /api/webhooks/clerk
// ============================================================

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import PocketBase from 'pocketbase';
import { env } from '@/lib/env';

const POCKETBASE_URL = env.POCKETBASE_URL;
const asPbUserId = (clerkId: string) => clerkId.trim();

export async function POST(req: Request) {
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('[WEBHOOK] Missing CLERK_WEBHOOK_SECRET');
    return new Response('Server misconfigured', { status: 500 });
  }

  // Get svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Verify the webhook signature
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle events
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);

  try {
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const pbUserId = asPbUserId(id);
      const email = email_addresses?.[0]?.email_address || '';
      const displayName = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0];

      try {
        const existing = await pb.collection('user_profiles').getFirstListItem(`user_id = "${pbUserId}"`) as any;
        await pb.collection('user_profiles').update(existing.id, {
          display_name: displayName,
        });
      } catch {
        await pb.collection('user_profiles').create({
          user_id: pbUserId,
          display_name: displayName,
          personality_desc: '',
          tone: 'friendly',
          context_main: '',
          context_soul: '',
          context_guards: '',
          profile_snapshot: JSON.stringify({ adaptations: {}, top_facts: [], last_updated: '' }),
          learning_progress: 0,
          total_conversations: 0,
          onboarding_complete: false,
        });
      }

      console.log(`[WEBHOOK] Synced PB profile for Clerk user: ${pbUserId}`);
    }

    if (evt.type === 'user.deleted') {
      const { id } = evt.data;
      if (id) {
        const pbUserId = asPbUserId(id);
        // Clean up: delete profile and facts for this user
        try {
          const profile = await pb.collection('user_profiles').getFirstListItem(`user_id = "${pbUserId}"`) as any;
          await pb.collection('user_profiles').delete(profile.id);
        } catch { /* Profile might not exist */ }

        try {
          const facts = await pb.collection('facts').getFullList({ filter: `user_id = "${pbUserId}"` }) as any[];
          for (const fact of facts) {
            await pb.collection('facts').delete(fact.id);
          }
        } catch { /* No facts to delete */ }

        console.log(`[WEBHOOK] Cleaned up PB data for deleted Clerk user: ${pbUserId}`);
      }
    }
  } catch (err) {
    console.error('[WEBHOOK] PocketBase sync error:', err);
    return new Response('Database sync failed', { status: 500 });
  }

  return new Response('Webhook processed', { status: 200 });
}
