'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    
    console.log('Starting registration...');
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setMsg('Account created! Redirecting...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setMsg(data.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setMsg('Error: ' + err.message);
    }
    
    setLoading(false);
  };

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="card-dark w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-2">
          <span className="text-[#e11d3f]">SAMMY</span>
          <span className="text-[#8c0018]">STORE</span>
        </h2>
        <p className="text-center text-[#a0a0b0] mb-8 font-mono text-sm">
          {`> NEW USER REGISTRATION`}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#e11d3f] text-sm font-mono mb-2">
              {`> ALIAS (NAME)`}
            </label>
            <input 
              name="name"
              type="text" 
              value={formData.name}
              onChange={handleChange}
              className="input-dark" 
              required 
            />
          </div>
          <div>
            <label className="block text-[#e11d3f] text-sm font-mono mb-2">
              {`> EMAIL_ADDRESS`}
            </label>
            <input 
              name="email"
              type="email" 
              value={formData.email}
              onChange={handleChange}
              className="input-dark" 
              required 
            />
          </div>
          <div>
            <label className="block text-[#e11d3f] text-sm font-mono mb-2">
              {`> PASSWORD`}
            </label>
            <input 
              name="password"
              type="password" 
              value={formData.password}
              onChange={handleChange}
              className="input-dark" 
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="btn-neon w-full mt-4"
          >
            {loading ? 'INITIALIZING...' : 'CREATE ACCOUNT'}
          </button>
        </form>
        
        {msg && (
          <p className={`mt-4 text-center font-mono text-sm ${
            msg.includes('created') ? 'text-[#25d366]' : 'text-[#e11d3f]'
          }`}>
            {msg}
          </p>
        )}
        
        <p className="text-center text-[#a0a0b0] mt-6 text-sm">
          Already have access?{' '}
          <Link href="/login" className="text-[#e11d3f] hover:underline">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
