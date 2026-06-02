/** Deep-link resume params after login/signup/OAuth (family + transfer flows). */

export type AuthResumeParams = {
  returnTo?: string;
  transferCode?: string;
  inviteCode?: string;
  inviteToken?: string;
};

export function parseAuthResumeParams(params: {
  returnTo?: string | string[];
  transferCode?: string | string[];
  inviteCode?: string | string[];
  inviteToken?: string | string[];
}): AuthResumeParams {
  const pick = (v: string | string[] | undefined): string | undefined => {
    if (v == null) return undefined;
    const s = Array.isArray(v) ? v[0] : v;
    const t = s?.trim();
    return t ? t : undefined;
  };

  return {
    returnTo: pick(params.returnTo),
    transferCode: pick(params.transferCode),
    inviteCode: pick(params.inviteCode),
    inviteToken: pick(params.inviteToken),
  };
}

export function authResumeParamsToRouteParams(resume: AuthResumeParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (resume.transferCode) out.transferCode = resume.transferCode;
  if (resume.inviteCode) out.inviteCode = resume.inviteCode;
  if (resume.inviteToken) out.inviteToken = resume.inviteToken;
  return out;
}

export function hasAuthResumeTarget(resume: AuthResumeParams): boolean {
  if (!resume.returnTo) return false;
  return !!(resume.transferCode || resume.inviteCode || resume.inviteToken);
}

export function authResumeParamsForNavigation(
  resume: AuthResumeParams
): Record<string, string> {
  return {
    returnTo: resume.returnTo ?? "",
    transferCode: resume.transferCode ?? "",
    inviteCode: resume.inviteCode ?? "",
    inviteToken: resume.inviteToken ?? "",
  };
}
