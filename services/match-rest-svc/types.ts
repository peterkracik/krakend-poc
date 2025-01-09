export interface Match {
  homeTeamId: number;
  awayTeamId: number;
  date: string;
  score?: {
    home: number;
    away: number;
  };
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED';
}
