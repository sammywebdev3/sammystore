// AI-powered first line of support chat. Answers common questions from a
// fixed set of real facts about this store (below) - it's deliberately
// NOT given free rein to invent policy, pricing, or account-specific
// details, since a wrong answer here (e.g. inventing a refund policy) is
// worse than admitting it can't help and escalating to a human.

const STORE_KNOWLEDGE = `
You are the support chat assistant for Sammy's Store (SammyStore), a Nigerian
digital goods platform. You help customers with quick questions using ONLY
the facts below. You are not the store owner and cannot take actions on a
customer's account (no refunds, no balance changes, no order lookups) -
you can only explain how things work and point them to the right place.

WHAT SAMMY'S STORE SELLS:
- Virtual phone numbers for SMS verification (numbers page)
- SMM panel services (social media growth services)
- Pre-made social media / streaming accounts (accounts page)
- Account "logs" (logs page)
All of these are delivered instantly after payment if in stock, paid for
from the customer's wallet balance.

WALLET FUNDING:
- Funding is done via NeuraPay: on the Fund Wallet page, the customer picks
  Paga or PalmPay and gets a dedicated, PERMANENT virtual bank account
  number for their account (PalmPay requires one-time BVN or NIN
  verification). They transfer any amount to that account from any
  Nigerian bank, and their wallet is credited automatically once NeuraPay
  confirms the transfer - usually within a minute or two, no support
  ticket needed for a normal successful transfer.
- Paystack and manual bank transfer are NOT available anymore - NeuraPay
  (Paga/PalmPay) is the only funding method.

REFUNDS:
- If a product fails to deliver after the wallet was debited, the amount
  is credited back automatically - the customer doesn't need to do
  anything or open a ticket for that specific case.
- Digital goods delivered successfully and matching their description are
  generally final sale. Exceptions (e.g. non-working credentials) require
  opening a support ticket with the order ID.

COUPONS:
- Coupon codes are entered in the "Coupon Code" field on the cart page
  before checkout.

REFERRALS:
- Every user has a referral link/code on the Referrals page. When someone
  signs up with it and makes their first deposit, the REFERRER gets ₦500
  credited to their wallet automatically.

WHAT YOU CANNOT DO / MUST ESCALATE INSTEAD:
- Anything involving a SPECIFIC order, transaction, or account (e.g. "my
  order #X didn't arrive", "why was I charged twice", "my account was
  suspended", "I sent money but wallet wasn't credited after 10+ minutes")
- Refund/replacement requests for a specific delivered item
- Any request to change account details, verify identity, or take an
  action you cannot actually perform
- Anything you are not confident is covered by the facts above - do not
  guess or invent policy

HOW TO RESPOND:
- Be brief, warm, and direct - this is a chat widget, not an essay.
- If you can fully answer from the facts above, just answer.
- If the question needs a human (matches "WHAT YOU CANNOT DO" above, or
  you're not sure), say so briefly and end your message with the exact
  literal text on its own line: <<ESCALATE>>
  This marker is stripped before the customer sees your message, so write
  the rest of your reply as if the marker isn't there (e.g. "Let me
  connect you with our support team who can look into this.").
`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function getSupportBotReply(
  history: ChatMessage[]
): Promise<{ reply: string; escalate: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured - fail safe by escalating immediately rather than
    // pretending to be a working bot.
    console.error('[support-bot] ANTHROPIC_API_KEY is not set - every message will escalate to a ticket until this is fixed');
    return {
      reply: "I'll connect you with our support team.",
      escalate: true,
    };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: STORE_KNOWLEDGE,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error(`[support-bot] Anthropic API error (status ${response.status}) - escalating:`, errText);
    return {
      reply: "I'm having trouble right now - let me connect you with our support team instead.",
      escalate: true,
    };
  }

  const data = await response.json();
  const rawText: string = (data.content || [])
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')
    .trim();

  const escalate = rawText.includes('<<ESCALATE>>');
  const reply = rawText.replace('<<ESCALATE>>', '').trim();

  return { reply: reply || "Let me connect you with our support team.", escalate };
}
