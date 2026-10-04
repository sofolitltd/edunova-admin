export type TeacherGender = "" | "male" | "female";

/** How students address a teacher, e.g. "তুষার স্যার". Mirrors the server's TeacherDisplayName. */
export function teacherDisplayName(t: { full_name: string; nickname: string; gender: TeacherGender }): string {
  const name = t.nickname || t.full_name;
  if (t.gender === "male") return `${name} স্যার`;
  if (t.gender === "female") return `${name} ম্যাম`;
  return name;
}
