export interface ShotsOptions {
  dryRun?: boolean;
}

export interface CapturePlan {
  desktopFull: boolean;
  mobileTop: boolean;
  sections: string[];
  url: string;
  serverCommand: string | null;
}

export const DEFAULT_PORT = 5173;

export function resolveTargetUrl(
  configScreenshotsUrl: string | undefined,
  serverCommand: string | null,
  port: number,
): string {
  if (configScreenshotsUrl) return configScreenshotsUrl;
  if (serverCommand) return `http://localhost:${port}`;
  return ""; // will prompt the user
}

export function buildCapturePlan(
  _opts: ShotsOptions,
  isWebApp: boolean,
  configScreenshotsUrl: string | undefined,
  serverCommand: string | null,
  configuredSections: string[] | undefined,
): { plan: CapturePlan; skipReason: string | null } {
  if (!isWebApp) {
    return {
      plan: {
        desktopFull: false,
        mobileTop: false,
        sections: [],
        url: "",
        serverCommand: null,
      },
      skipReason:
        "This project does not look like a web app — skipping screenshots.\n(README + social drafts still work; try `tolongssin readme`.)",
    };
  }
  return {
    plan: {
      desktopFull: true,
      mobileTop: true,
      sections: configuredSections ?? [],
      url: resolveTargetUrl(configScreenshotsUrl, serverCommand, DEFAULT_PORT),
      serverCommand,
    },
    skipReason: null,
  };
}

export function sectionFileName(n: number): string {
  return `section-${n}.png`;
}
