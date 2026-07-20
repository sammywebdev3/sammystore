export const metadata = {
  title: "Refund Policy - Sammy's Store",
  description: "Refund Policy for Sammy's Store - when and how refunds are issued.",
};

export default function RefundPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray">
      <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 19, 2026</p>

      <h2>1. Failed Delivery</h2>
      <p>
        If a Product cannot be delivered after your wallet has been debited -
        for example, if a supplier is temporarily unavailable or the item goes
        out of stock mid-purchase - the full amount is automatically credited
        back to your Site wallet. You do not need to open a support ticket for
        this; it happens instantly as part of the purchase process.
      </p>

      <h2>2. Digital Goods - Delivered as Described</h2>
      <p>
        Because Products (numbers, SMM services, and accounts) are digital
        goods delivered instantly, all sales are generally final once a Product
        has been successfully delivered and matches its listed description.
      </p>

      <h2>3. When You May Request a Replacement or Refund</h2>
      <p>You may open a support ticket requesting a replacement or refund if:</p>
      <ul>
        <li>The delivered account credentials do not work as described (e.g. wrong login format, invalid password) - reported promptly after purchase.</li>
        <li>A virtual number fails to receive the expected verification code within a reasonable window.</li>
        <li>An SMM order was not started or completed as ordered.</li>
      </ul>
      <p>
        Each product listing may include its own specific replacement terms
        (for example, some account listings note &quot;no replacement for
        locked accounts&quot; or a defined refund window) - the terms shown on
        the individual product page take priority over this general policy.
      </p>

      <h2>4. What Is Not Covered</h2>
      <ul>
        <li>Accounts or numbers that are locked, banned, or restricted by the third-party platform due to your own usage (e.g. suspicious login location, violating that platform&apos;s terms).</li>
        <li>Buyer's remorse or change of mind after successful delivery.</li>
        <li>Failure to follow login instructions provided with the product (e.g. required VPN/IP location).</li>
      </ul>

      <h2>5. How to Request a Refund or Replacement</h2>
      <p>
        Open a ticket from your <a href="/support">Support</a> page with your
        order ID and a description of the issue. Our team will review and
        respond as quickly as possible.
      </p>

      <h2>6. Refund Method</h2>
      <p>
        Approved refunds are credited to your Site wallet balance. Wallet
        balance can be used toward any future purchase on the Site.
      </p>
    </main>
  );
}
