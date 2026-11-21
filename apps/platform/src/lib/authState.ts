// Decides whether a failed profile request must end the session.
// Offline network failures keep the cached session; a 401 always logs out.
export function shouldForceLogout(
  isError: boolean,
  errorStatus: number | undefined,
  hasCachedUser: boolean,
): boolean {
  if (!isError) return false;
  if (errorStatus === 401) return true;
  return !hasCachedUser;
}
