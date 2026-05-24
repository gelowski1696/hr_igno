export const SIDEBAR_COLLAPSED_STORAGE_KEY = "vmjamtech-hr:sidebar-collapsed";

export function getStoredSidebarCollapsed(storage: Storage | undefined = globalThis.window?.localStorage) {
  if (!storage) {
    return false;
  }

  return storage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
}

export function setStoredSidebarCollapsed(
  collapsed: boolean,
  storage: Storage | undefined = globalThis.window?.localStorage
) {
  if (!storage) {
    return;
  }

  storage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
}
