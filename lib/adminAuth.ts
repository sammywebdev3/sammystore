import jwt from 'jsonwebtoken';
import dbConnect from './mongodb';
import User from '@/models/User';

export async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    await dbConnect();
    const user = await User.findById(decoded.id);
    
    // Check if user exists AND email matches the ADMIN_EMAIL variable
    if (user && user.email === process.env.ADMIN_EMAIL) {
      return user;
    }
    return null;
  } catch {
    return null;
  }
}
