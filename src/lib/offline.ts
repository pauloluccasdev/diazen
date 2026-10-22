export const SNAPSHOT_KEY = "diazen-dashboard";
export const SESSION_EPOCH = "diazen-session-epoch";
export function clearOfflineData() {
  try {
    sessionStorage.removeItem(SNAPSHOT_KEY);
    localStorage.setItem(SESSION_EPOCH, String(Date.now()));
  } catch {
    /* Cache é opcional; não impedir logout em navegação privada. */
  }
}
