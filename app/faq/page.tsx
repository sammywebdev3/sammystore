import Link from 'next/link';

export const metadata = {
  title: "How to Buy / FAQ - Sammy's Store",
  description: "Step-by-step guide to buying virtual numbers, SMM services, and accounts on Sammy's Store, plus frequently asked questions.",
};

const faqs = [
  {
    q: 'How do I fund my wallet?',
    a: 'Go to your Dashboard and click "Fund Wallet." You\'ll be redirected to Paystack to complete payment - your wallet is credited automatically within seconds of a successful payment.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Numbers, SMM orders, and account purchases are delivered instantly after payment, as long as the item is in stock.',
  },
  {
    q: 'What happens if my order fails after payment?',
    a: 'If a product cannot be delivered after your wallet has been debited, the full amount is automatically credited back to your wallet - no support ticket needed. See our Refund Policy for full details.',
  },
  {
    q: 'Can I get a refund for a delivered account or number?',
    a: 'Digital goods delivered successfully and matching their description are generally final sale. Exceptions (e.g. non-working credentials) are covered under our Refund Policy - open a support ticket with your order ID.',
  },
  {
    q: 'Do you accept coupon codes?',
    a: 'Yes. If you have a coupon code, enter it in the "Coupon Code" field on your cart page before checking out.',
  },
  {
    q: 'How do I contact support?',
    a: 'Open a ticket from the Support page with your order ID and a description of the issue. You\'ll also get an email notification when we reply.',
  },
  {
    q: 'Is my payment information safe?',
    a: 'Wallet funding is processed directly through Paystack - we never see or store your full card details. See our Privacy Policy for more.',
  },
];

export default function FaqPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">How to Buy / FAQ</h1>
      <p className="text-gray-600 mb-10">Everything you need to know before your first purchase.</p>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4">How to Buy - Step by Step</h2>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center">1</span>
            <p className="text-gray-700"><strong>Create an account</strong> or log in if you already have one.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center">2</span>
            <p className="text-gray-700"><strong>Fund your wallet</strong> from the Dashboard using Paystack.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center">3</span>
            <p className="text-gray-700"><strong>Browse</strong> Numbers, SMM, or Accounts and pick what you need.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center">4</span>
            <p className="text-gray-700"><strong>Add to cart</strong> (or buy directly from the product page), apply a coupon if you have one, then checkout.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center">5</span>
            <p className="text-gray-700"><strong>Receive your order instantly</strong> - check your Orders page or your email for confirmation and login instructions.</p>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-1">{item.q}</p>
              <p className="text-gray-600 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-gray-600">
        Still have questions?{' '}
        <Link href="/support" className="text-[#f97316] font-semibold hover:underline">
          Open a support ticket
        </Link>
        .
      </p>
    </main>
  );
}
