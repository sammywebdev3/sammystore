Remove Paystack + Manual Bank Transfer funding
================================================
Updated: app/fund/page.tsx  (now shows only balance + NeuraPay Paga/PalmPay funding)

DELETE these (dead code, zip can't delete files for you):
  app/api/wallet/fund-paystack/
  app/api/wallet/verify-paystack/
  app/fund/callback/

Note: FAQ/privacy/landing page COPY still mentions Paystack as a payment
method in a few places (app/page.tsx, app/faq/page.tsx,
app/privacy/page.tsx, components/FAQAccordion.tsx) - these are just text,
not functional code, and were left as-is. Say the word if you want that
wording updated too.

HOW TO USE:
1. Upload to repo root in Codespace.
2. unzip -o remove-paystack-manual.zip -d . && rm remove-paystack-manual.zip
3. rm -rf app/api/wallet/fund-paystack app/api/wallet/verify-paystack app/fund/callback
4. npm run dev - confirm the fund page now only shows NeuraPay.
5. git add -A
   git commit -m "Remove Paystack and manual bank transfer funding"
   git push
