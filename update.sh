#!/bin/bash
set -e
cp sammystore-update/sammystore-main/lib/hstora.ts lib/hstora.ts
cp sammystore-update/sammystore-main/app/api/accounts/products/route.ts app/api/accounts/products/route.ts
cp sammystore-update/sammystore-main/app/api/accounts/buy/route.ts app/api/accounts/buy/route.ts
cp sammystore-update/sammystore-main/app/api/cart/checkout/route.ts app/api/cart/checkout/route.ts
cp sammystore-update/sammystore-main/app/api/search/route.ts app/api/search/route.ts
rm -rf sammystore-update
echo "All files copied successfully."
