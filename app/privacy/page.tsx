export const metadata = {
  title: "Privacy Policy - Sammy's Store",
  description: "Privacy Policy for Sammy's Store - how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 prose prose-gray">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: July 19, 2026</p>

      <p>
        This Privacy Policy explains how Sammy&apos;s Store (&quot;we&quot;,
        &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your
        information when you use sammystorelogs.com (the &quot;Site&quot;).
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>Account information: email address, password (stored hashed), and account activity.</li>
        <li>Transaction information: wallet funding and purchase history, needed to process and deliver orders.</li>
        <li>Support information: any details you provide when opening a support ticket.</li>
        <li>Technical information: IP address and basic request metadata, used for fraud prevention and rate limiting.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To create and manage your account.</li>
        <li>To process payments and deliver purchased Products.</li>
        <li>To respond to support requests.</li>
        <li>To detect and prevent fraud, abuse, or violations of our Terms of Service.</li>
      </ul>

      <h2>3. Payment Processing</h2>
      <p>
        Wallet funding is processed through our third-party payment processor
        (Paystack). We do not store your full card details on our servers -
        these are handled directly by our payment processor in accordance with
        their own security and privacy standards.
      </p>

      <h2>4. Third-Party Product Suppliers</h2>
      <p>
        Some Products (numbers, SMM services, and accounts) are fulfilled
        through third-party suppliers. Delivering these Products may require
        sharing limited order information (such as product ID and quantity)
        with those suppliers. We do not share your personal account
        information, payment details, or contact information with suppliers
        beyond what is strictly necessary to fulfil an order.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain account and transaction information for as long as your
        account is active, and as needed to comply with legal obligations,
        resolve disputes, and enforce our agreements.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        information by contacting us through our <a href="/support">Support</a>{' '}
        page. Note that some information may be retained where required for
        legal, security, or fraud-prevention purposes.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies/local storage to keep you logged in and
        maintain your session. We do not use third-party advertising trackers.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Continued use of
        the Site after changes are posted constitutes acceptance of the revised
        policy.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this Privacy Policy can be sent through our{' '}
        <a href="/support">Support</a> page.
      </p>
    </main>
  );
}
