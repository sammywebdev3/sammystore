[1mdiff --git a/app/admin/page.tsx b/app/admin/page.tsx[m
[1mindex 0afe698..b25ef51 100644[m
[1m--- a/app/admin/page.tsx[m
[1m+++ b/app/admin/page.tsx[m
[36m@@ -239,6 +239,9 @@[m [mexport default function AdminPage() {[m
               <Link href="/admin/tickets" className="px-6 py-3 bg-white border-2 border-[#f97316] rounded-lg font-bold text-[#f97316] hover:bg-orange-50 transition-all">[m
                 {'> TICKETS'}[m
               </Link>[m
[32m+[m[32m              <Link href="/admin/announcements" className="px-6 py-3 bg-white border-2 border-[#f97316] rounded-lg font-bold text-[#f97316] hover:bg-orange-50 transition-all">[m
[32m+[m[32m                {'> ANNOUNCEMENTS'}[m
[32m+[m[32m              </Link>[m
               <Link href="/admin/catalog" className="px-6 py-3 bg-white border-2 border-[#f97316] rounded-lg font-bold text-[#f97316] hover:bg-orange-50 transition-all">[m
                 {'> MY_CATALOG'}[m
               </Link>[m
[1mdiff --git a/app/admin/tickets/page.tsx b/app/admin/tickets/page.tsx[m
[1mindex 3aca53f..a5f0749 100644[m
[1m--- a/app/admin/tickets/page.tsx[m
[1m+++ b/app/admin/tickets/page.tsx[m
[36m@@ -6,6 +6,7 @@[m [mimport Link from 'next/link';[m
 interface TicketMessage {[m
   sender: 'user' | 'admin';[m
   message: string;[m
[32m+[m[32m  attachmentUrl?: string;[m
   createdAt: string;[m
 }[m
 [m
[36m@@ -163,6 +164,15 @@[m [mfunction AdminTicketsPageInner() {[m
               >[m
                 <p className="text-xs text-gray-500 mb-1">{m.sender === 'admin' ? 'Support' : 'Customer'}</p>[m
                 <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.message}</p>[m
[32m+[m[32m                {m.attachmentUrl && ([m
[32m+[m[32m                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">[m
[32m+[m[32m                    <img[m
[32m+[m[32m                      src={m.attachmentUrl}[m
[32m+[m[32m                      alt="Attachment"[m
[32m+[m[32m                      className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300"[m
[32m+[m[32m                    />[m
[32m+[m[32m                  </a>[m
[32m+[m[32m                )}[m
               </div>[m
             ))}[m
           </div>[m
[1mdiff --git a/app/api/support/tickets/route.ts b/app/api/support/tickets/route.ts[m
[1mindex a7bbbd6..d530072 100644[m
[1m--- a/app/api/support/tickets/route.ts[m
[1m+++ b/app/api/support/tickets/route.ts[m
[36m@@ -27,21 +27,37 @@[m [mexport async function POST(request: Request) {[m
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });[m
   }[m
 [m
[31m-  const { subject, message } = await request.json();[m
[32m+[m[32m  const { subject, message, attachmentUrl } = await request.json();[m
   if (!subject?.trim() || !message?.trim()) {[m
     return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });[m
   }[m
 [m
[32m+[m[32m  // Attachments are optional screenshots (e.g. payment proof), sent as a[m
[32m+[m[32m  // base64 data URI. Validate type/size server-side too, since the client[m
[32m+[m[32m  // check can be bypassed.[m
[32m+[m[32m  let cleanAttachment: string | undefined;[m
[32m+[m[32m  if (attachmentUrl) {[m
[32m+[m[32m    const isImageDataUri = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(attachmentUrl);[m
[32m+[m[32m    const approxBytes = (attachmentUrl.length * 3) / 4;[m
[32m+[m[32m    if (!isImageDataUri) {[m
[32m+[m[32m      return NextResponse.json({ error: 'Attachment must be an image' }, { status: 400 });[m
[32m+[m[32m    }[m
[32m+[m[32m    if (approxBytes > 5 * 1024 * 1024) {[m
[32m+[m[32m      return NextResponse.json({ error: 'Attachment must be under 5MB' }, { status: 400 });[m
[32m+[m[32m    }[m
[32m+[m[32m    cleanAttachment = attachmentUrl;[m
[32m+[m[32m  }[m
[32m+[m
   try {[m
     const ticket = await Ticket.create({[m
       userId,[m
       subject: subject.trim(),[m
       status: 'pending',[m
[31m-      messages: [{ sender: 'user', message: message.trim() }],[m
[32m+[m[32m      messages: [{ sender: 'user', message: message.trim(), attachmentUrl: cleanAttachment }],[m
     });[m
 [m
     sendTelegramMessage([m
[31m-      `🆕 <b>New support ticket</b>\n<b>Subject:</b> ${subject.trim()}\n<b>Message:</b> ${message.trim().slice(0, 300)}`[m
[32m+[m[32m      `🆕 <b>New support ticket</b>\n<b>Subject:</b> ${subject.trim()}\n<b>Message:</b> ${message.trim().slice(0, 300)}${cleanAttachment ? '\n📎 Screenshot attached (view in admin panel)' : ''}`[m
     );[m
 [m
     return NextResponse.json({ success: true, ticket });[m
[1mdiff --git a/app/fund/page.tsx b/app/fund/page.tsx[m
[1mindex 245755c..0177363 100644[m
[1m--- a/app/fund/page.tsx[m
[1m+++ b/app/fund/page.tsx[m
[36m@@ -4,12 +4,29 @@[m [mimport Link from 'next/link';[m
 import Navbar from '@/components/Navbar';[m
 import Sidebar from '@/components/Sidebar';[m
 [m
[32m+[m[32m// Paystack is temporarily paused (compliance flag on the account).[m
[32m+[m[32m// Flip this back to true once Paystack is reactivated.[m
[32m+[m[32mconst PAYSTACK_ENABLED = false;[m
[32m+[m
[32m+[m[32mconst BANK_DETAILS = {[m
[32m+[m[32m  bank: 'United Bank of Africa (UBA)',[m
[32m+[m[32m  accountNumber: '2136011152',[m
[32m+[m[32m  accountName: 'Akintan Ayomide Olamilekan',[m
[32m+[m[32m};[m
[32m+[m
 export default function FundPage() {[m
   const [balance, setBalance] = useState(0);[m
   const [amount, setAmount] = useState('');[m
   const [loading, setLoading] = useState(false);[m
   const [msg, setMsg] = useState('');[m
   const [msgType, setMsgType] = useState('');[m
[32m+[m[32m  const [manualLoading, setManualLoading] = useState(false);[m
[32m+[m[32m  const [manualMsg, setManualMsg] = useState('');[m
[32m+[m[32m  const [manualMsgType, setManualMsgType] = useState('');[m
[32m+[m[32m  const [manualAmount, setManualAmount] = useState('');[m
[32m+[m[32m  const [manualRef, setManualRef] = useState('');[m
[32m+[m[32m  const [manualScreenshot, setManualScreenshot] = useState<string | null>(null);[m
[32m+[m[32m  const [manualScreenshotName, setManualScreenshotName] = useState('');[m
 [m
   useEffect(() => {[m
     const token = localStorage.getItem('token');[m
[36m@@ -64,6 +81,87 @@[m [mexport default function FundPage() {[m
     setLoading(false);[m
   };[m
 [m
[32m+[m[32m  const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB[m
[32m+[m
[32m+[m[32m  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {[m
[32m+[m[32m    const file = e.target.files?.[0];[m
[32m+[m[32m    if (!file) {[m
[32m+[m[32m      setManualScreenshot(null);[m
[32m+[m[32m      setManualScreenshotName('');[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (!file.type.startsWith('image/')) {[m
[32m+[m[32m      setManualMsgType('error');[m
[32m+[m[32m      setManualMsg('Please upload an image file (PNG, JPG, etc.)');[m
[32m+[m[32m      e.target.value = '';[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (file.size > MAX_SCREENSHOT_BYTES) {[m
[32m+[m[32m      setManualMsgType('error');[m
[32m+[m[32m      setManualMsg('Screenshot must be under 5MB');[m
[32m+[m[32m      e.target.value = '';[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    setManualMsg('');[m
[32m+[m[32m    const reader = new FileReader();[m
[32m+[m[32m    reader.onload = () => {[m
[32m+[m[32m      setManualScreenshot(reader.result as string);[m
[32m+[m[32m      setManualScreenshotName(file.name);[m
[32m+[m[32m    };[m
[32m+[m[32m    reader.onerror = () => {[m
[32m+[m[32m      setManualMsgType('error');[m
[32m+[m[32m      setManualMsg('Could not read that file, please try another');[m
[32m+[m[32m    };[m
[32m+[m[32m    reader.readAsDataURL(file);[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  const handleManualSubmit = async () => {[m
[32m+[m[32m    setManualMsg('');[m
[32m+[m[32m    const token = localStorage.getItem('token');[m
[32m+[m[32m    if (!token) {[m
[32m+[m[32m      setManualMsgType('error');[m
[32m+[m[32m      setManualMsg('Please login to submit a funding request');[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m[32m    if (!manualAmount || parseFloat(manualAmount) <= 0) {[m
[32m+[m[32m      setManualMsgType('error');[m
[32m+[m[32m      setManualMsg('Enter a valid amount');[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    setManualLoading(true);[m
[32m+[m[32m    try {[m
[32m+[m[32m      const res = await fetch('/api/support/tickets', {[m
[32m+[m[32m        method: 'POST',[m
[32m+[m[32m        headers: {[m
[32m+[m[32m          'Content-Type': 'application/json',[m
[32m+[m[32m          'Authorization': `Bearer ${token}`[m
[32m+[m[32m        },[m
[32m+[m[32m        body: JSON.stringify({[m
[32m+[m[32m          subject: `Manual wallet funding - ₦${manualAmount}`,[m
[32m+[m[32m          message: `I have made a bank transfer of ₦${manualAmount} to fund my wallet.\n\nBank: ${BANK_DETAILS.bank}\nAccount: ${BANK_DETAILS.accountNumber} (${BANK_DETAILS.accountName})\nTransfer reference/sender name: ${manualRef || 'Not provided'}\n\nPlease verify and credit my wallet.`,[m
[32m+[m[32m          attachmentUrl: manualScreenshot || undefined[m
[32m+[m[32m        })[m
[32m+[m[32m      });[m
[32m+[m[32m      const data = await res.json();[m
[32m+[m[32m      if (data.success) {[m
[32m+[m[32m        setManualMsgType('success');[m
[32m+[m[32m        setManualMsg('Request submitted! We will verify your transfer and credit your wallet shortly.');[m
[32m+[m[32m        setManualAmount('');[m
[32m+[m[32m        setManualRef('');[m
[32m+[m[32m        setManualScreenshot(null);[m
[32m+[m[32m        setManualScreenshotName('');[m
[32m+[m[32m      } else {[m
[32m+[m[32m        setManualMsgType('error');[m
[32m+[m[32m        setManualMsg(data.error || 'Failed to submit request');[m
[32m+[m[32m      }[m
[32m+[m[32m    } catch (error: any) {[m
[32m+[m[32m      setManualMsgType('error');[m
[32m+[m[32m      setManualMsg('Network error: ' + error.message);[m
[32m+[m[32m    }[m
[32m+[m[32m    setManualLoading(false);[m
[32m+[m[32m  };[m
[32m+[m
   return ([m
     <div className="min-h-screen bg-gray-50">[m
       <Navbar />[m
[36m@@ -99,12 +197,22 @@[m [mexport default function FundPage() {[m
 [m
             <button[m
               onClick={handleFund}[m
[31m-              disabled={loading || !amount}[m
[32m+[m[32m              disabled={!PAYSTACK_ENABLED || loading || !amount}[m
               className="btn-primary w-full disabled:opacity-50"[m
             >[m
[31m-              {loading ? 'Redirecting to Paystack...' : 'Pay with Paystack'}[m
[32m+[m[32m              {!PAYSTACK_ENABLED[m
[32m+[m[32m                ? 'Paystack Temporarily Unavailable'[m
[32m+[m[32m                : loading[m
[32m+[m[32m                  ? 'Redirecting to Paystack...'[m
[32m+[m[32m                  : 'Pay with Paystack'}[m
             </button>[m
 [m
[32m+[m[32m            {!PAYSTACK_ENABLED && ([m
[32m+[m[32m              <p className="mt-3 text-sm text-gray-500 text-center">[m
[32m+[m[32m                Card/online payments are paused for now. Please use manual bank transfer below.[m
[32m+[m[32m              </p>[m
[32m+[m[32m            )}[m
[32m+[m
             {msg && ([m
               <div className={`mt-6 p-4 rounded-xl ${[m
                 msgType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'[m
[36m@@ -114,17 +222,99 @@[m [mexport default function FundPage() {[m
             )}[m
           </div>[m
 [m
[31m-          <div className="card p-6 md:p-8 max-w-2xl">[m
[31m-            <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Method</h2>[m
[31m-            <div className="flex items-center p-4 bg-gray-50 rounded-xl">[m
[31m-              <div className="w-12 h-12 bg-[#f97316] rounded-full flex items-center justify-center text-white text-xl mr-4">[m
[31m-                💳[m
[32m+[m[32m          <div className="card p-6 md:p-8 max-w-2xl mb-8">[m
[32m+[m[32m            <h2 className="text-xl font-bold text-gray-800 mb-2">Manual Bank Transfer</h2>[m
[32m+[m[32m            <p className="text-gray-600 text-sm mb-6">[m
[32m+[m[32m              Transfer directly to the account below, then submit your details so we can verify and credit your wallet.[m
[32m+[m[32m            </p>[m
[32m+[m
[32m+[m[32m            <div className="p-4 bg-gray-50 rounded-xl mb-6 space-y-2">[m
[32m+[m[32m              <div className="flex justify-between">[m
[32m+[m[32m                <span className="text-sm text-gray-500">Bank</span>[m
[32m+[m[32m                <span className="font-semibold text-gray-800">{BANK_DETAILS.bank}</span>[m
               </div>[m
[31m-              <div>[m
[31m-                <p className="font-semibold text-gray-800">Paystack</p>[m
[31m-                <p className="text-sm text-gray-600">Pay securely by card, bank, or transfer via Paystack</p>[m
[32m+[m[32m              <div className="flex justify-between">[m
[32m+[m[32m                <span className="text-sm text-gray-500">Account Number</span>[m
[32m+[m[32m                <span className="font-semibold text-gray-800">{BANK_DETAILS.accountNumber}</span>[m
[32m+[m[32m              </div>[m
[32m+[m[32m              <div className="flex justify-between">[m
[32m+[m[32m                <span className="text-sm text-gray-500">Account Name</span>[m
[32m+[m[32m                <span className="font-semibold text-gray-800">{BANK_DETAILS.accountName}</span>[m
               </div>[m
             </div>[m
[32m+[m
[32m+[m[32m            <div className="mb-4">[m
[32m+[m[32m              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Transferred (₦)</label>[m
[32m+[m[32m              <input[m
[32m+[m[32m                type="number"[m
[32m+[m[32m                value={manualAmount}[m
[32m+[m[32m                onChange={(e) => setManualAmount(e.target.value)}[m
[32m+[m[32m                placeholder="Enter amount you sent"[m
[32m+[m[32m                className="input-field"[m
[32m+[m[32m                min="100"[m
[32m+[m[32m                step="100"[m
[32m+[m[32m              />[m
[32m+[m[32m            </div>[m
[32m+[m
[32m+[m[32m            <div className="mb-6">[m
[32m+[m[32m              <label className="block text-sm font-semibold text-gray-700 mb-2">[m
[32m+[m[32m                Sender Name / Transfer Reference (optional)[m
[32m+[m[32m              </label>[m
[32m+[m[32m              <input[m
[32m+[m[32m                type="text"[m
[32m+[m[32m                value={manualRef}[m
[32m+[m[32m                onChange={(e) => setManualRef(e.target.value)}[m
[32m+[m[32m                placeholder="e.g. name on the sending account or reference number"[m
[32m+[m[32m                className="input-field"[m
[32m+[m[32m              />[m
[32m+[m[32m            </div>[m
[32m+[m
[32m+[m[32m            <div className="mb-6">[m
[32m+[m[32m              <label className="block text-sm font-semibold text-gray-700 mb-2">[m
[32m+[m[32m                Payment Screenshot (optional, max 5MB)[m
[32m+[m[32m              </label>[m
[32m+[m[32m              <input[m
[32m+[m[32m                type="file"[m
[32m+[m[32m                accept="image/*"[m
[32m+[m[32m                onChange={handleScreenshotChange}[m
[32m+[m[32m                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#f97316]/10 file:text-[#f97316] file:font-semibold hover:file:bg-[#f97316]/20"[m
[32m+[m[32m              />[m
[32m+[m[32m              {manualScreenshot && ([m
[32m+[m[32m                <div className="mt-3 flex items-center gap-3">[m
[32m+[m[32m                  <img[m
[32m+[m[32m                    src={manualScreenshot}[m
[32m+[m[32m                    alt="Screenshot preview"[m
[32m+[m[32m                    className="w-20 h-20 object-cover rounded-lg border border-gray-300"[m
[32m+[m[32m                  />[m
[32m+[m[32m                  <div className="flex-1 min-w-0">[m
[32m+[m[32m                    <p className="text-sm text-gray-700 truncate">{manualScreenshotName}</p>[m
[32m+[m[32m                    <button[m
[32m+[m[32m                      type="button"[m
[32m+[m[32m                      onClick={() => { setManualScreenshot(null); setManualScreenshotName(''); }}[m
[32m+[m[32m                      className="text-xs text-red-600 hover:underline"[m
[32m+[m[32m                    >[m
[32m+[m[32m                      Remove[m
[32m+[m[32m                    </button>[m
[32m+[m[32m                  </div>[m
[32m+[m[32m                </div>[m
[32m+[m[32m              )}[m
[32m+[m[32m            </div>[m
[32m+[m
[32m+[m[32m            <button[m
[32m+[m[32m              onClick={handleManualSubmit}[m
[32m+[m[32m              disabled={manualLoading || !manualAmount}[m
[32m+[m[32m              className="btn-primary w-full disabled:opacity-50"[m
[32m+[m[32m            >[m
[32m+[m[32m              {manualLoading ? 'Submitting...' : 'I Have Made the Transfer'}[m
[32m+[m[32m            </button>[m
[32m+[m
[32m+[m[32m            {manualMsg && ([m
[32m+[m[32m              <div className={`mt-6 p-4 rounded-xl ${[m
[32m+[m[32m                manualMsgType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'[m
[32m+[m[32m              }`}>[m
[32m+[m[32m                <p className="font-semibold">{manualMsg}</p>[m
[32m+[m[32m              </div>[m
[32m+[m[32m            )}[m
           </div>[m
         </main>[m
       </div>[m
[1mdiff --git a/app/layout.tsx b/app/layout.tsx[m
[1mindex cd9c7bd..f678a28 100644[m
[1m--- a/app/layout.tsx[m
[1m+++ b/app/layout.tsx[m
[36m@@ -4,6 +4,7 @@[m [mimport "./globals.css";[m
 import BottomNav from "@/components/BottomNav";[m
 import SupportWidget from "@/components/SupportWidget";[m
 import Footer from "@/components/Footer";[m
[32m+[m[32mimport AnnouncementBanner from "@/components/AnnouncementBanner";[m
 [m
 const geistSans = Geist({[m
   variable: "--font-geist-sans",[m
[36m@@ -31,6 +32,7 @@[m [mexport default function RootLayout({[m
       className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}[m
     >[m
       <body className="min-h-full flex flex-col">[m
[32m+[m[32m        <AnnouncementBanner />[m
         <div className="pb-16 md:pb-0 flex flex-col min-h-full">[m
           <div className="flex-1">{children}</div>[m
           <Footer />[m
[1mdiff --git a/app/support/page.tsx b/app/support/page.tsx[m
[1mindex cf7738f..ad6cbd7 100644[m
[1m--- a/app/support/page.tsx[m
[1m+++ b/app/support/page.tsx[m
[36m@@ -5,6 +5,7 @@[m [mimport { useRouter } from 'next/navigation';[m
 interface TicketMessage {[m
   sender: 'user' | 'admin';[m
   message: string;[m
[32m+[m[32m  attachmentUrl?: string;[m
   createdAt: string;[m
 }[m
 [m
[36m@@ -176,6 +177,15 @@[m [mexport default function SupportPage() {[m
               >[m
                 <p className="text-xs text-gray-500 mb-1">{m.sender === 'admin' ? 'Support' : 'You'}</p>[m
                 <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.message}</p>[m
[32m+[m[32m                {m.attachmentUrl && ([m
[32m+[m[32m                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">[m
[32m+[m[32m                    <img[m
[32m+[m[32m                      src={m.attachmentUrl}[m
[32m+[m[32m                      alt="Attachment"[m
[32m+[m[32m                      className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300"[m
[32m+[m[32m                    />[m
[32m+[m[32m                  </a>[m
[32m+[m[32m                )}[m
               </div>[m
             ))}[m
           </div>[m
[1mdiff --git a/models/Ticket.ts b/models/Ticket.ts[m
[1mindex 0679a38..9d95cc1 100644[m
[1m--- a/models/Ticket.ts[m
[1m+++ b/models/Ticket.ts[m
[36m@@ -3,6 +3,7 @@[m [mimport mongoose, { Schema, Document, Model } from 'mongoose';[m
 export interface ITicketMessage {[m
   sender: 'user' | 'admin';[m
   message: string;[m
[32m+[m[32m  attachmentUrl?: string;[m
   createdAt: Date;[m
 }[m
 [m
[36m@@ -21,6 +22,10 @@[m [mconst TicketMessageSchema = new Schema<ITicketMessage>([m
   {[m
     sender: { type: String, enum: ['user', 'admin'], required: true },[m
     message: { type: String, required: true },[m
[32m+[m[32m    // Optional payment-proof screenshot, stored as a base64 data URI.[m
[32m+[m[32m    // Kept small (client enforces a size cap) since it lives inline on[m
[32m+[m[32m    // the document rather than in separate file storage.[m
[32m+[m[32m    attachmentUrl: { type: String },[m
   },[m
   { timestamps: { createdAt: true, updatedAt: false } }[m
 );[m
