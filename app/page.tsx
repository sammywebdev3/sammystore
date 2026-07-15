'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Ticker from '@/components/Ticker';
import FAQAccordion from '@/components/FAQAccordion';
import Testimonials from '@/components/Testimonials';

interface Activity {
  user: string;
  description: string;
  amount: number;
  time: string;
}

export default function Home() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [stats, setStats] = useState<{ totalUsers: number; totalTransactions: number } | null>(null);

  useEffect(() => {
    fetch('/api/stats/recent-activity')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setActivity(data.activity || []);
      })
      .catch(() => {});

    fetch('/api/stats/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats({ totalUsers: data.totalUsers, totalTransactions: data.totalTransactions });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Ticker />

      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-800">SAMMY</span>
                <span className="text-[#f97316] font-bold">STORE</span>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-[#f97316] font-medium">
                Login
              </Link>
              <Link href="/register" className="btn-primary">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gray-800">One Wallet. </span>
            <span className="text-[#f97316]">Every Digital Service.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Virtual numbers, social media growth, and verified accounts — all powered
            by one wallet balance. Fund once, use anything.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-[#f97316]">✓</span>
              <span className="text-gray-700 font-medium">100% Verified</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-[#f97316]">⚡</span>
              <span className="text-gray-700 font-medium">Instant Delivery</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-[#f97316]">🔒</span>
              <span className="text-gray-700 font-medium">Secure Payments</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 inline-block text-center">
              Create free account →
            </Link>
            <a href="#services" className="btn-secondary text-lg px-8 inline-block text-center">
              Browse services ↓
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Already have an account? <Link href="/login" className="text-[#f97316] font-semibold">Log in here →</Link>
          </p>
        </div>
      </section>

      {stats && (stats.totalUsers >= 50 || stats.totalTransactions >= 100) && (
        <section className="bg-white py-8 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-[#f97316]">{stats.totalUsers.toLocaleString()}+</p>
                <p className="text-gray-600 text-sm">Registered users</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#f97316]">{stats.totalTransactions.toLocaleString()}</p>
                <p className="text-gray-600 text-sm">Successful transactions</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="services" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 text-center">Everything in one place</h2>
          <p className="text-gray-600 text-center mb-4">One wallet. Zero friction.</p>
          <p className="text-center mb-12">
            <Link href="/services" className="text-[#f97316] font-semibold">Browse full catalog →</Link>
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/numbers" className="card p-6 text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl">📞</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Virtual Numbers</h3>
              <p className="text-gray-600 text-sm">Receive SMS from 200+ countries</p>
            </Link>

            <Link href="/smm" className="card p-6 text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">SMM Panel</h3>
              <p className="text-gray-600 text-sm">Grow your social media presence</p>
            </Link>

            <Link href="/accounts" className="card p-6 text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Buy Accounts</h3>
              <p className="text-gray-600 text-sm">Premium pre-verified accounts</p>
            </Link>

            <Link href="/catalog" className="card p-6 text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl">🏷️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">My Catalog</h3>
              <p className="text-gray-600 text-sm">Sold directly by SammyStore</p>
            </Link>

            <Link href="/fund" className="card p-6 text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Wallet</h3>
              <p className="text-gray-600 text-sm">Fund once, use everywhere</p>
            </Link>
          </div>
        </div>
      </section>

      {activity.length > 0 && (
        <section className="bg-white py-8 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">RECENT ACTIVITY</h3>
            <div className="flex overflow-x-auto space-x-6 pb-2">
              {activity.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 whitespace-nowrap">
                  <span className="text-[#f97316] font-semibold">{item.user}</span>
                  <span className="text-gray-600">bought</span>
                  <span className="text-gray-800 font-medium">{item.description}</span>
                  <span className="text-[#f97316] font-semibold">₦{item.amount.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="how-it-works" className="py-16 bg-gradient-to-br from-primary-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">From Signup To First Purchase In Minutes</h2>
          <p className="text-gray-600 mb-12">No complicated setup. Just sign up, fund, and go.</p>

          <div className="space-y-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#f97316] text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Create Your Account</h3>
              <p className="text-gray-600 max-w-md">Name, email, password - you're in your dashboard in under a minute.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#f97316] text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Fund Your Wallet</h3>
              <p className="text-gray-600 max-w-md">Card or bank transfer via Paystack - instant, secure, no waiting for approval.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#f97316] text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Use Anything, Anytime</h3>
              <p className="text-gray-600 max-w-md">Buy a number, grow a social account, or get a verified account - one wallet powers it all.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 text-center">What people are saying</h2>
          <p className="text-gray-600 text-center mb-12">Real feedback from people using SammyStore.</p>
          <Testimonials />
        </div>
      </section>

      <section id="faq" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 text-center">Quick answers</h2>
          <p className="text-gray-600 text-center mb-12">Common questions, straight answers.</p>
          <FAQAccordion />
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">
                <span className="text-[#f97316]">Sammy</span>Store
              </h3>
              <p className="text-gray-400">One wallet for virtual numbers, social media growth, and verified accounts.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#faq" className="hover:text-[#f97316]">FAQ</a></li>
                <li><a href="#how-it-works" className="hover:text-[#f97316]">How It Works</a></li>
                <li><Link href="/register" className="hover:text-[#f97316]">Create Account</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-gray-400">📧 1sammystore1@gmail.com</p>
              <p className="text-gray-400">📱 +234 816 313 7129</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
