import type { GuidedTeam } from './types.ts';

export function pendingDirectionRequest(team: GuidedTeam) {
  return team.state?.direction === 'alternative' && !team.state.frozen
    ? team.requests.find(request => request.status === 'pending') : undefined;
}

export function projectProgressLabel(team: GuidedTeam) {
  if (!team.state) return 'Not started';
  if (team.state.direction === 'recommended') return 'Using your recommended direction';
  if (team.state.direction === 'alternative') {
    const request = team.requests.find(request => request.status !== 'superseded');
    if (request?.status === 'approved') return 'Alternative approved';
    if (request?.status === 'changes_requested') return 'Changes requested';
    if (request?.status === 'pending') return 'Alternative pending';
  }
  return 'Research saved';
}

export function projectQuestion(team: GuidedTeam) {
  return (team.state?.direction === 'alternative'
    ? team.requests.find(request => request.status !== 'superseded')?.proposal.question : undefined)
    ?? team.state?.research.question;
}
