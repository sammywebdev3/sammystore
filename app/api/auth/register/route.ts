import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Please fill all fields' }, { status: 400 });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate a unique API key for the user
    const apiKey = 'sammy_' + Math.random().toString(36).substr(2, 9);

    const user = await User.create({ name, email, password, apiKey });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully!',
      user: { name: user.name, email: user.email } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
