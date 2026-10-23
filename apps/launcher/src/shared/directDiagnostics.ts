export interface DirectRouteReport {
  at: string;
  reason: string;
  source?: 'launch' | 'diagnostic';
  launcherVersion?: string;
  measurement?: string;
  normal?: number[];
  relay?: number[];
  direct?: number[];
  kcp?: number[];
  stage?: string;
  error?: { code?: string; message: string };
  probeErrors?: Record<string, { code?: string; message: string }>;
  details?: string[];
}
