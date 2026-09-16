const TOKEN_KEY = "edunova_admin_token";
const ADMIN_KEY = "edunova_admin";
const TEACHER_TOKEN_KEY = "edunova_teacher_token";
const TEACHER_KEY = "edunova_teacher";
const USER_TOKEN_KEY = "edunova_user_token";
const USER_KEY = "edunova_user";

// Admin auth
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

export function getStoredAdmin(): { id: number; email: string; full_name: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(ADMIN_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: { id: number; email: string; full_name: string; role: string }): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function removeStoredAdmin(): void {
  localStorage.removeItem(ADMIN_KEY);
}

// Teacher auth — a fully independent identity from admin_users/admins.
export function getTeacherToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TEACHER_TOKEN_KEY);
}

export function setTeacherToken(token: string): void {
  localStorage.setItem(TEACHER_TOKEN_KEY, token);
}

export function removeTeacherToken(): void {
  localStorage.removeItem(TEACHER_TOKEN_KEY);
}

export function isTeacherAuthenticated(): boolean {
  return !!getTeacherToken();
}

export function getStoredTeacher(): { id: number; email: string; full_name: string } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TEACHER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredTeacher(teacher: { id: number; email: string; full_name: string }): void {
  localStorage.setItem(TEACHER_KEY, JSON.stringify(teacher));
}

export function removeStoredTeacher(): void {
  localStorage.removeItem(TEACHER_KEY);
}

// Shared "staff" pages (attendance, lessons, daily content, exams, results,
// doubts) are rendered under both /admin/* and /teacher/*, by an admin or a
// teacher respectively — these resolve to whichever identity is actually
// signed in for the portal the page is currently rendered under, based on
// the current path, so the same page works correctly for both without
// mixing up a lingering token from the other portal in the same browser.
function isTeacherPath(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/teacher");
}

export function getToken(): string | null {
  return isTeacherPath() ? getTeacherToken() : getAdminToken();
}

export function isAuthenticated(): boolean {
  return isTeacherPath() ? isTeacherAuthenticated() : isAdminAuthenticated();
}

export function getLoginPath(pathname: string): string {
  return pathname.startsWith("/teacher") ? "/teacher/login" : "/admin/login";
}

// User auth
export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserToken(token: string): void {
  localStorage.setItem(USER_TOKEN_KEY, token);
}

export function removeUserToken(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function isUserAuthenticated(): boolean {
  return !!getUserToken();
}

export function getStoredUser(): { id: number; full_name: string; mobile: string; verified: boolean } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredUser(user: { id: number; full_name: string; mobile: string; verified: boolean }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
