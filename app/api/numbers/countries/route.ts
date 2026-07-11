import { getCountries } from '@/lib/fiveSimAdapter';
export const dynamic = 'force-dynamic';
export async function GET() { return getCountries(); }
