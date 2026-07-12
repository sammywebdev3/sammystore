import { NextResponse } from 'next/server';
import { checkSms } from '@/lib/tigerSms';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const activationId = new URL(req.url).searchParams.get('id');
    
    if (!activationId) {
      return NextResponse.json(
        { success: false, error: 'Activation ID required' },
        { status: 400 }
      );
    }

    const result = await checkSms(activationId);
    
    return NextResponse.json({
      success: true,
      status: result.status,
      sms: result.sms,
      statusCode: result.statusCode
    });
  } catch (e: any) {
    console.error('Check SMS error:', e);
    return NextResponse.json(
      { success: false, error: e.message || 'Failed to check SMS' },
      { status: 500 }
    );
  }
}
