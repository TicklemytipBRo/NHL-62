import { getRosterResponse } from '../../../../../lib/nhl-roster.mjs';
export async function GET(_request: Request, {params}: {params: Promise<{team:string}>}) {
  const {team}=await params;
  return getRosterResponse(team.toUpperCase());
}
