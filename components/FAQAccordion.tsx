'use client';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'How fast do virtual numbers arrive?',
    answer: 'Numbers are issued instantly. If an SMS doesn\'t arrive in time, the number purchase is refunded to your wallet automatically.',
  },
  {
    question: 'How do I fund my wallet?',
    answer: 'Fund via bank transfer to your dedicated NeuraPay account (Paga or PalmPay) - it credits your wallet automatically once the transfer is confirmed.',
  },
  {
    question: 'What happens if a purchase fails?',
    answer: 'If a provider fails to deliver (a number, an SMM order, or an account), your wallet is refunded automatically - no support ticket needed.',
  },
  {
    question: 'Do I need to create an account to browse?',
    answer: 'No - you can browse Virtual Numbers, SMM services, and Accounts without logging in. You\'ll only need an account to fund your wallet and check out.',
  },
  {
    question: 'What can I buy with my wallet balance?',
    answer: 'One wallet balance works across every service - virtual numbers, SMM growth services, and pre-verified accounts.',
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full flex items-center justify-between p-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-gray-800">{faq.question}</span>
              <span className={`text-[#f97316] transition-transform ${isOpen ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-gray-600 text-sm">{faq.answer}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
