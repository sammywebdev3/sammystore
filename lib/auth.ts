import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  email: string;
}

export function getUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded.id;
  } catch (e) { 
    return null; 
  }
}
