export const SCAN_COMMANDS = {
  ISSUE: "WBHUB:ISSUE",
  RETURN: "WBHUB:RETURN",
  NEXT: "WBHUB:NEXT",
} as const;

export type ScanCommand = keyof typeof SCAN_COMMANDS;

const BY_VALUE = new Map<string, ScanCommand>(
  Object.entries(SCAN_COMMANDS).map(([k, v]) => [v, k as ScanCommand])
);

export function matchScanCommand(code: string): ScanCommand | null {
  return BY_VALUE.get(code.trim()) ?? null;
}
