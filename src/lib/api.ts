const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  Object.assign(headers, (options.headers as Record<string, string>) || {});

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/teacher")) {
      localStorage.removeItem("edunova_teacher_token");
      localStorage.removeItem("edunova_teacher");
      window.location.href = "/teacher/login";
    } else if (path.startsWith("/admin")) {
      localStorage.removeItem("edunova_admin_token");
      localStorage.removeItem("edunova_admin");
      window.location.href = "/admin/login";
    } else {
      localStorage.removeItem("edunova_user_token");
      localStorage.removeItem("edunova_user");
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export const api = {
  // User Auth
  register: (fullName: string, mobile: string, password: string) =>
    request<{ message: string }>("/register", {
      method: "POST",
      body: JSON.stringify({ full_name: fullName, mobile, password }),
    }),

  login: (mobile: string, password: string) =>
    request<{ token: string; user: User }>("/login", {
      method: "POST",
      body: JSON.stringify({ mobile, password }),
    }),

  getUser: (token: string) =>
    request<User>("/user", { token }),

  sendOTP: (mobile: string) =>
    request<{ message: string }>("/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),

  verifyOTP: (mobile: string, code: string) =>
    request<{ message: string }>("/verify-otp", {
      method: "POST",
      body: JSON.stringify({ mobile, code }),
    }),

  resendOTP: (mobile: string) =>
    request<{ message: string }>("/resend-otp", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),

  changePassword: (token: string, oldPassword: string, newPassword: string) =>
    request<{ message: string }>("/change-password", {
      method: "PUT",
      token,
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  // User Profile
  updateUserProfile: (token: string, data: { full_name: string }) =>
    request<User>("/user/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  getUserEnrollments: (token: string) =>
    request<Enrollment[]>("/user/enrollments", { token }),

  getUserDashboard: (token: string) =>
    request<{
      total_enrollments: number;
      pending_enrollments: number;
      approved_enrollments: number;
      total_exams: number;
      completed_exams: number;
    }>("/user/dashboard", { token }),

  // User-facing features
  submitDoubt: (token: string, data: { question_text: string; subject?: string; chapter?: string; image_url?: string }) =>
    request<Doubt>("/doubts", { method: "POST", body: JSON.stringify(data), token }),

  getMyDoubts: (token: string) =>
    request<Doubt[]>("/doubts", { token }),

  getUpcomingEvents: (token: string) =>
    request<{ id: number; title: string; description: string; event_type: string; date: string; color: string }[]>("/calendar/upcoming", { token }),

  getTodayLessons: (token: string) =>
    request<{ id: number; course_id: number; course_name: string; title: string; description: string; subject: string; chapter: string; lesson_date: string }[]>("/lessons/today", { token }),

  getPublishedArticles: (token: string) =>
    request<{ id: number; title: string; content: string; category: string; video_url: string; image_url: string; created_at: string }[]>("/articles", { token }),

  // Admin Auth
  adminLogin: (email: string, password: string) =>
    request<{ token: string; admin: AdminUser }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Teacher Auth (fully independent identity from admin_users)
  teacherLogin: (email: string, password: string) =>
    request<{ token: string; teacher: Teacher }>("/admin/teacher-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Admin Profile
  getAdminProfile: (token: string) =>
    request<AdminUser>("/admin/profile", { token }),

  updateAdminProfile: (token: string, data: { full_name: string; email: string }) =>
    request<AdminUser>("/admin/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  changeAdminPassword: (token: string, oldPassword: string, newPassword: string) =>
    request<{ message: string }>("/admin/change-password", {
      method: "PUT",
      token,
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  // Dashboard
  getDashboard: (token: string) =>
    request<DashboardStats>("/admin/dashboard", { token }),

  // Users
  getUsers: (token: string, page = 1, search = "") =>
    request<PaginatedUsers>(`/admin/users?page=${page}&per_page=10&search=${encodeURIComponent(search)}`, { token }),

  getUserById: (token: string, id: number) =>
    request<User>(`/admin/users/${id}`, { token }),

  toggleVerify: (token: string, id: number) =>
    request<{ verified: boolean }>(`/admin/users/${id}/verify`, {
      method: "PUT",
      token,
    }),

  deleteUser: (token: string, id: number) =>
    request<{ message: string }>(`/admin/users/${id}`, {
      method: "DELETE",
      token,
    }),

  // Courses
  getCourses: (token: string) =>
    request<Course[]>("/admin/courses", { token }),

  createCourse: (token: string, data: CreateCoursePayload) =>
    request<Course>("/admin/courses", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateCourse: (token: string, id: number, data: CreateCoursePayload) =>
    request<Course>(`/admin/courses/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  deleteCourse: (token: string, id: number) =>
    request<{ message: string }>(`/admin/courses/${id}`, {
      method: "DELETE",
      token,
    }),

  // Exams
  getExams: (token: string, batchId?: number) => {
    const qs = batchId ? `?batch_id=${batchId}` : "";
    return request<Exam[]>(`/admin/exams${qs}`, { token });
  },

  createExam: (token: string, data: CreateExamPayload) =>
    request<Exam>("/admin/exams", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateExam: (token: string, id: number, data: CreateExamPayload) =>
    request<Exam>(`/admin/exams/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  deleteExam: (token: string, id: number) =>
    request<{ message: string }>(`/admin/exams/${id}`, {
      method: "DELETE",
      token,
    }),

  getExamQuestions: (token: string, examId: number) =>
    request<ExamQuestion[]>(`/admin/exams/${examId}/questions`, { token }),

  addExamQuestion: (token: string, examId: number, data: ExamQuestionPayload) =>
    request<ExamQuestion>(`/admin/exams/${examId}/questions`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  deleteExamQuestion: (token: string, examId: number, qid: number) =>
    request<{ message: string }>(`/admin/exams/${examId}/questions/${qid}`, {
      method: "DELETE",
      token,
    }),

  // Public (no auth)
  getAllCourses: () =>
    request<Course[]>("/courses"),

  getCourse: (id: number) =>
    request<Course>(`/courses/${id}`),

  getPublicExamQuestions: (examId: number) =>
    request<ExamQuestion[]>(`/exams/${examId}/questions`),

  // Enrollments
  createEnrollment: (data: CreateEnrollmentPayload) =>
    request<Enrollment>("/enrollments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getEnrollments: (token: string, page = 1, status = "all", search = "", userId?: number) => {
    const params = new URLSearchParams({ page: String(page), per_page: "20", status, search });
    if (userId) params.set("user_id", String(userId));
    return request<PaginatedEnrollments>(`/admin/enrollments?${params.toString()}`, { token });
  },

  updateEnrollmentStatus: (token: string, id: number, status: string) =>
    request<Enrollment>(`/admin/enrollments/${id}/status`, {
      method: "PUT",
      token,
      body: JSON.stringify({ status }),
    }),

  deleteEnrollment: (token: string, id: number) =>
    request<{ message: string }>(`/admin/enrollments/${id}`, {
      method: "DELETE",
      token,
    }),

  directEnroll: (token: string, data: { user_id?: number; mobile?: string; course_id: number; batch_id?: number; amount?: number }) =>
    request<Enrollment>("/admin/enrollments/direct", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  getFreeCourses: () =>
    request<Course[]>("/user/free-courses"),

  // Admin Management (master_admin only)
  listAdmins: (token: string) =>
    request<AdminUser[]>("/admin/admins", { token }),

  createAdmin: (token: string, data: { email: string; password: string; full_name: string; role: string }) =>
    request<AdminUser>("/admin/admins", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  updateAdminRole: (token: string, id: number, role: string) =>
    request<{ message: string }>(`/admin/admins/${id}/role`, {
      method: "PUT",
      token,
      body: JSON.stringify({ role }),
    }),

  deleteAdmin: (token: string, id: number) =>
    request<{ message: string }>(`/admin/admins/${id}`, {
      method: "DELETE",
      token,
    }),

  resetAdminPassword: (token: string, id: number, password: string) =>
    request<{ message: string }>(`/admin/admins/${id}/reset-password`, {
      method: "PUT",
      token,
      body: JSON.stringify({ password }),
    }),

  // Teacher Management (admin & master_admin) — teachers live in their own
  // table, independent from admin_users.
  listTeachers: (token: string) =>
    request<Teacher[]>("/admin/teachers", { token }),

  createTeacher: (token: string, data: { email: string; password: string; full_name: string }) =>
    request<Teacher>("/admin/teachers", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  deleteTeacher: (token: string, id: number) =>
    request<{ message: string }>(`/admin/teachers/${id}`, {
      method: "DELETE",
      token,
    }),

  resetTeacherPassword: (token: string, id: number, password: string) =>
    request<{ message: string }>(`/admin/teachers/${id}/reset-password`, {
      method: "PUT",
      token,
      body: JSON.stringify({ password }),
    }),
};

// Types
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface BatchTeacher {
  id: number;
  email: string;
  full_name: string;
}

export interface BatchSubject {
  id: number;
  subject_id: number;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string;
  days: string[];
  start_time: string;
  end_time: string;
}

export interface TeacherBatch {
  id: number;
  name: string;
  class_level: string;
  shift: string;
  code: string;
  schedule: string;
  student_count: number;
  course_id: number;
}

// Teacher self-service (teacher portal profile/password/batches)
export const teacherApi = {
  getProfile: (token: string) =>
    request<Teacher>("/admin/teacher-profile", { token }),

  updateProfile: (token: string, data: { full_name: string; email: string }) =>
    request<Teacher>("/admin/teacher-profile", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  changePassword: (token: string, oldPassword: string, newPassword: string) =>
    request<{ message: string }>("/admin/teacher-change-password", {
      method: "PUT",
      token,
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  getMyBatches: (token: string) =>
    request<TeacherBatch[]>("/admin/teacher-batches", { token }),
};

export interface DailyRegistration {
  date: string;
  count: number;
}

export interface DashboardStats {
  total_users: number;
  verified_users: number;
  total_courses: number;
  total_exams: number;
  weekly_registrations: DailyRegistration[];
}

export interface BulkHierarchyResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  notes: string;
  created_by: number;
  created_at: string;
}

export interface MonthlyFinance {
  month: string;
  revenue: number;
  expenses: number;
}

export interface FinanceStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  pending_payments: number;
  approved_payments: number;
  monthly_data: MonthlyFinance[];
  recent_enrollments: Enrollment[];
  recent_expenses: Expense[];
}

export interface BatchMonthlyRevenue {
  month: string;
  revenue: number;
}

export interface BatchFinanceStats {
  total_revenue: number;
  approved_count: number;
  pending_payments: number;
  pending_count: number;
  monthly_data: BatchMonthlyRevenue[];
  recent_payments: Enrollment[];
}

export interface BatchAttendanceDay {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface BatchStudentAttendance {
  student_id: number;
  full_name: string;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export interface BatchMonthlyAttendance {
  month: string;
  total_classes: number;
  overall_rate: number;
  days: BatchAttendanceDay[];
  students: BatchStudentAttendance[];
}

export interface PaginatedExpenses {
  expenses: Expense[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Batch {
  id: number;
  class_level: string;
  course_id: number;
  course_name: string;
  name: string;
  days: string[];
  start_time: string;
  end_time: string;
  schedule: string;
  max_students: number;
  status: string;
  admission_fee: number;
  note_fee: number;
  monthly_fee: number;
  shift: string;
  type: string;
  year: number;
  section: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  full_name: string;
  mobile: string;
  verified: boolean;
  father_name: string;
  father_mobile: string;
  mother_name: string;
  mother_mobile: string;
  notification_mobile: string;
  gender: string;
  religion: string;
  student_class: string;
  shift: string;
  school: string;
  present_address: string;
  permanent_address: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Course {
  id: number;
  title: string;
  title_bn: string;
  description: string;
  subject: string;
  teacher: string;
  instructors: string;
  class_level: string;
  type: string;
  schedule: string;
  color: string;
  gradient: string;
  price: number;
  old_price: number;
  duration: string;
  badge: string;
  students_count: number;
  classes_count: number;
  exams_count: number;
  rating: number;
  reviews_count: number;
  curriculum: CurriculumMonth[];
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface CurriculumMonth {
  month: string;
  topics: string[];
}

export interface CreateCoursePayload {
  title: string;
  title_bn: string;
  description: string;
  subject: string;
  teacher: string;
  instructors: string;
  class_level: string;
  type: string;
  schedule: string;
  color: string;
  gradient: string;
  price: number;
  old_price: number;
  duration: string;
  badge: string;
  students_count: number;
  classes_count: number;
  exams_count: number;
  rating: number;
  reviews_count: number;
  curriculum: CurriculumMonth[];
  features: string[];
}

export interface Exam {
  id: number;
  title: string;
  course_id: number;
  course_name: string;
  batch_id: number;
  batch_name: string;
  date: string;
  time: string;
  duration: string;
  total_questions: number;
  total_marks: number;
  is_live: boolean;
  live_at: string | null;
  class_level: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExamPayload {
  title: string;
  course_id: number;
  batch_id?: number;
  date: string;
  time: string;
  duration: string;
  total_marks?: number;
  questions?: ExamQuestionPayload[];
}

export interface ExamQuestion {
  id: number;
  exam_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
  created_at: string;
}

export interface ExamQuestionPayload {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
}

export interface Enrollment {
  id: number;
  course_id: number;
  course_name: string;
  course_type: string;
  full_name: string;
  mobile: string;
  student_id: string;
  user_id: number | null;
  payment_method: string;
  mobile_banking: string;
  amount: number;
  sent_from: string;
  sent_to: string;
  transaction_id: string;
  referral_source: string;
  status: string;
  enrolled_by: string;
  batch_id: number | null;
  batch_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentPayload {
  course_id: number;
  full_name: string;
  mobile: string;
  payment_method: string;
  mobile_banking: string;
  amount: number;
  sent_from: string;
  sent_to: string;
  referral_source: string;
}

export interface PaginatedEnrollments {
  enrollments: Enrollment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ==================== Question Bank Types ====================

export interface ClassItem {
  id: number;
  name: string;
  name_bn: string;
  order_index: number;
  code: string;
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  name_bn: string;
  created_at: string;
}

export interface Book {
  id: number;
  subject_id: number;
  class_name: string;
  subject_name: string;
  name: string;
  name_bn: string;
  publisher: string;
  created_at: string;
}

export interface Chapter {
  id: number;
  book_id: number;
  book_name: string;
  name: string;
  name_bn: string;
  order_index: number;
  created_at: string;
}

export interface Topic {
  id: number;
  chapter_id: number;
  chapter_name: string;
  name: string;
  name_bn: string;
  order_index: number;
  created_at: string;
}

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: number;
  class_id: number | null;
  class_name: string;
  subject_id: number | null;
  subject_name: string;
  book_id: number | null;
  book_name: string;
  chapter_id: number | null;
  chapter_name: string;
  topic_id: number | null;
  topic_name: string;
  question_type: string;
  question_text: string;
  options: string | null;
  answer: string;
  explanation: string;
  marks: number;
  difficulty: string;
  tags: string[];
  source: string;
  source_page: number | null;
  language: string;
  status: string;
  created_by: number | null;
  reviewed_by: number | null;
  created_at: string;
  updated_at: string;
  version: number;
  usage_count: number;
  last_used_at: string | null;
}

export interface CreateQuestionPayload {
  class_id: number | null;
  subject_id: number | null;
  book_id: number | null;
  chapter_id: number | null;
  topic_id: number | null;
  question_type: string;
  question_text: string;
  options: string | null;
  answer: string;
  explanation: string;
  marks: number;
  difficulty: string;
  tags: string[];
  source: string;
  source_page: number | null;
  language: string;
}

export interface PaginatedQuestions {
  questions: Question[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface QuestionBankStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_class: ClassStats[];
  by_chapter: ChapterStats[];
}

export interface ClassStats {
  class_id: number;
  class_name: string;
  total: number;
  by_type: Record<string, number>;
}

export interface ChapterStats {
  chapter_id: number;
  chapter_name: string;
  class_name: string;
  subject_name: string;
  total: number;
  by_type: Record<string, number>;
}

export interface BulkUploadResult {
  import_id: number;
  total_rows: number;
  imported: number;
  duplicates: number;
  errors: number;
  error_rows: { row: number; errors: string[] }[];
}

export interface SheetPreview {
  header: string[];
  rows: string[][];
  total: number;
}

export interface QuestionImport {
  id: number;
  filename: string;
  total_rows: number;
  imported: number;
  duplicates: number;
  errors: number;
  error_details: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

// ==================== Question Bank API ====================

// Export as separate namespaces for clean TypeScript
export const academicManagementApi = {
  // Classes
  getClasses: (token: string) =>
    request<ClassItem[]>("/admin/classes", { token }),
  createClass: (token: string, data: { name: string; name_bn: string; order_index: number; code: string }) =>
    request<ClassItem>("/admin/classes", { method: "POST", body: JSON.stringify(data), token }),
  updateClass: (token: string, id: number, data: { name: string; name_bn: string; order_index: number; code: string }) =>
    request<ClassItem>(`/admin/classes/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteClass: (token: string, id: number) =>
    request<{ message: string }>(`/admin/classes/${id}`, { method: "DELETE", token }),

  // Subjects
  getSubjects: (token: string) =>
    request<Subject[]>("/admin/subjects", { token }),
  createSubject: (token: string, data: { name: string; name_bn: string }) =>
    request<Subject>("/admin/subjects", { method: "POST", body: JSON.stringify(data), token }),
  updateSubject: (token: string, id: number, data: { name: string; name_bn: string }) =>
    request<Subject>(`/admin/subjects/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteSubject: (token: string, id: number) =>
    request<{ message: string }>(`/admin/subjects/${id}`, { method: "DELETE", token }),

  // Books
  getBooks: (token: string, subjectId?: number, classId?: number) => {
    const params = new URLSearchParams();
    if (subjectId) params.set("subject_id", String(subjectId));
    if (classId) params.set("class_id", String(classId));
    const qs = params.toString();
    return request<Book[]>(`/admin/books${qs ? `?${qs}` : ""}`, { token });
  },
  createBook: (token: string, data: { subject_id: number; class_id: number; name: string; name_bn: string; publisher: string }) =>
    request<Book>("/admin/books", { method: "POST", body: JSON.stringify(data), token }),
  updateBook: (token: string, id: number, data: { subject_id: number; class_id: number; name: string; name_bn: string; publisher: string }) =>
    request<Book>(`/admin/books/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteBook: (token: string, id: number) =>
    request<{ message: string }>(`/admin/books/${id}`, { method: "DELETE", token }),

  // Chapters
  getChapters: (token: string, bookId: number) =>
    request<Chapter[]>(`/admin/chapters?book_id=${bookId}`, { token }),
  createChapter: (token: string, data: { book_id: number; name: string; name_bn: string; order_index: number }) =>
    request<Chapter>("/admin/chapters", { method: "POST", body: JSON.stringify(data), token }),
  updateChapter: (token: string, id: number, data: { book_id: number; name: string; name_bn: string; order_index: number }) =>
    request<Chapter>(`/admin/chapters/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteChapter: (token: string, id: number) =>
    request<{ message: string }>(`/admin/chapters/${id}`, { method: "DELETE", token }),

  // Topics
  getTopics: (token: string, chapterId: number) =>
    request<Topic[]>(`/admin/topics?chapter_id=${chapterId}`, { token }),
  createTopic: (token: string, data: { chapter_id: number; name: string; name_bn: string; order_index: number }) =>
    request<Topic>("/admin/topics", { method: "POST", body: JSON.stringify(data), token }),
  updateTopic: (token: string, id: number, data: { chapter_id: number; name: string; name_bn: string; order_index: number }) =>
    request<Topic>(`/admin/topics/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteTopic: (token: string, id: number) =>
    request<{ message: string }>(`/admin/topics/${id}`, { method: "DELETE", token }),

  bulkImport: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<BulkHierarchyResult>("/admin/academic-management/bulk", {
      method: "POST",
      token,
      body: formData,
      headers: {},
    });
  },
};

// Export as separate namespace
export const questionsApi = {
  getQuestions: (token: string, params: {
    page?: number;
    per_page?: number;
    class_id?: number;
    subject_id?: number;
    book_id?: number;
    chapter_id?: number;
    topic_id?: number;
    question_type?: string;
    difficulty?: string;
    status?: string;
    search?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.set(key, String(val));
      }
    });
    const qs = searchParams.toString();
    return request<PaginatedQuestions>(`/admin/questions${qs ? `?${qs}` : ""}`, { token });
  },

  createQuestion: (token: string, data: CreateQuestionPayload) =>
    request<Question>("/admin/questions", { method: "POST", body: JSON.stringify(data), token }),

  getQuestion: (token: string, id: number) =>
    request<Question>(`/admin/questions/${id}`, { token }),

  updateQuestion: (token: string, id: number, data: CreateQuestionPayload) =>
    request<Question>(`/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(data), token }),

  deleteQuestion: (token: string, id: number) =>
    request<{ message: string }>(`/admin/questions/${id}`, { method: "DELETE", token }),

  updateStatus: (token: string, id: number, status: string) =>
    request<{ message: string }>(`/admin/questions/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
      token,
    }),

  checkDuplicate: (token: string, questionText: string) =>
    request<{ is_duplicate: boolean; reason: string; similar_id: number | null }>(
      "/admin/questions/check-duplicate",
      { method: "POST", body: JSON.stringify({ question_text: questionText }), token }
    ),

  bulkUpload: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/admin/questions/bulk`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data as BulkUploadResult;
  },

  fetchSheet: (token: string, url: string) =>
    request<SheetPreview>("/admin/questions/fetch-sheet", {
      method: "POST",
      body: JSON.stringify({ url }),
      token,
    }),

  getStats: (token: string) =>
    request<QuestionBankStats>("/admin/questions/stats", { token }),

  getImportHistory: (token: string) =>
    request<QuestionImport[]>("/admin/imports", { token }),
};

export interface SmsBalance {
  balance: number;
  is_success: boolean;
  status_message: string;
  response_code: number;
}

export const financeApi = {
  getStats: (token: string) =>
    request<FinanceStats>("/admin/finance/stats", { token }),

  getExpenses: (token: string, page = 1, category = "", search = "") => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", "20");
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    return request<PaginatedExpenses>(`/admin/expenses?${params.toString()}`, { token });
  },

  createExpense: (token: string, data: { category: string; description: string; amount: number; date: string; notes: string }) =>
    request<Expense>("/admin/expenses", { method: "POST", body: JSON.stringify(data), token }),

  updateExpense: (token: string, id: number, data: { category: string; description: string; amount: number; date: string; notes: string }) =>
    request<Expense>(`/admin/expenses/${id}`, { method: "PUT", body: JSON.stringify(data), token }),

  deleteExpense: (token: string, id: number) =>
    request<{ message: string }>(`/admin/expenses/${id}`, { method: "DELETE", token }),
};

export interface SmsTemplate {
  id: number;
  name: string;
  body: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SendSmsPayload {
  template_id?: number;
  message?: string;
  mobiles?: string[];
  student_ids?: number[];
}

export interface SendSmsResult {
  sent: number;
  failed: { mobile: string; error: string }[];
}

export const smsApi = {
  getBalance: (token: string) =>
    request<SmsBalance>("/admin/sms/balance", { token }),

  getTemplates: (token: string) =>
    request<SmsTemplate[]>("/admin/sms/templates", { token }),

  createTemplate: (token: string, data: { name: string; body: string }) =>
    request<SmsTemplate>("/admin/sms/templates", { method: "POST", body: JSON.stringify(data), token }),

  updateTemplate: (token: string, id: number, data: { name: string; body: string }) =>
    request<SmsTemplate>(`/admin/sms/templates/${id}`, { method: "PUT", body: JSON.stringify(data), token }),

  deleteTemplate: (token: string, id: number) =>
    request<{ message: string }>(`/admin/sms/templates/${id}`, { method: "DELETE", token }),

  send: (token: string, data: SendSmsPayload) =>
    request<SendSmsResult>("/admin/sms/send", { method: "POST", body: JSON.stringify(data), token }),
};

export const batchApi = {
  getBatches: (token: string, courseId?: number, classLevel?: string, shift?: string, type?: string, year?: number) => {
    const params = new URLSearchParams();
    if (courseId) params.set("course_id", String(courseId));
    if (classLevel) params.set("class_level", String(classLevel));
    if (shift) params.set("shift", String(shift));
    if (type) params.set("type", String(type));
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return request<Batch[]>(`/admin/batches${qs ? `?${qs}` : ""}`, { token });
  },

  checkBatchName: (token: string, name: string, excludeId?: number) => {
    const params = new URLSearchParams({ name });
    if (excludeId) params.set("id", String(excludeId));
    return request<{ available: boolean }>(`/admin/batches/check-name?${params.toString()}`, { token });
  },

  checkBatchCode: (token: string, code: string, excludeId?: number) => {
    const params = new URLSearchParams({ code });
    if (excludeId) params.set("id", String(excludeId));
    return request<{ available: boolean }>(`/admin/batches/check-code?${params.toString()}`, { token });
  },

  getNextStudentId: (token: string, batchId: number) =>
    request<{ student_id: string }>(`/admin/batches/${batchId}/next-student-id`, { token }),

  checkStudentId: (token: string, studentId: string) => {
    const params = new URLSearchParams({ student_id: studentId });
    return request<{ available: boolean }>(`/admin/batches/check-student-id?${params.toString()}`, { token });
  },

  createBatch: (token: string, data: { course_id?: number; class_level: string; shift: string; type: string; name: string; days: string[]; start_time: string; end_time: string; max_students: number; status: string; admission_fee: number; note_fee: number; monthly_fee: number; year: number; section: string; code: string }) =>
    request<Batch>("/admin/batches", { method: "POST", body: JSON.stringify(data), token }),

  updateBatch: (token: string, id: number, data: { course_id?: number; class_level: string; shift: string; type: string; name: string; days: string[]; start_time: string; end_time: string; max_students: number; status: string; admission_fee: number; note_fee: number; monthly_fee: number; year: number; section: string; code: string }) =>
    request<Batch>(`/admin/batches/${id}`, { method: "PUT", body: JSON.stringify(data), token }),

  deleteBatch: (token: string, id: number) =>
    request<{ message: string }>(`/admin/batches/${id}`, { method: "DELETE", token }),

  getBatchStats: (token: string, courseId: number) =>
    request<{ id: number; name: string; student_count: number }[]>(`/admin/batches/stats?course_id=${courseId}`, { token }),

  getBatchStudents: (token: string, batchId: number) =>
    request<{ id: number; course_id: number; course_name: string; full_name: string; mobile: string; student_id: string; user_id: number | null; amount: number; enrolled_by: string; created_at: string }[]>(`/admin/batches/${batchId}/students`, { token }),

  getBatchFinance: (token: string, batchId: number) =>
    request<BatchFinanceStats>(`/admin/batches/${batchId}/finance`, { token }),

  getBatchMonthlyAttendance: (token: string, batchId: number, month: string) =>
    request<BatchMonthlyAttendance>(`/admin/batches/${batchId}/attendance/monthly?month=${month}`, { token }),

  // Batch <-> teacher assignment
  getBatchTeachers: (token: string, batchId: number) =>
    request<BatchTeacher[]>(`/admin/batches/${batchId}/teachers`, { token }),

  assignTeacher: (token: string, batchId: number, teacherId: number) =>
    request<{ message: string }>(`/admin/batches/${batchId}/teachers`, {
      method: "POST", body: JSON.stringify({ teacher_id: teacherId }), token,
    }),

  unassignTeacher: (token: string, batchId: number, teacherId: number) =>
    request<{ message: string }>(`/admin/batches/${batchId}/teachers/${teacherId}`, { method: "DELETE", token }),

  // Batch <-> subject assignment + per-subject weekly schedule. A subject
  // can have multiple entries (different periods), so each schedule slot
  // is its own row, addressed by its own entry id.
  getBatchSubjects: (token: string, batchId: number) =>
    request<BatchSubject[]>(`/admin/batches/${batchId}/subjects`, { token }),

  assignSubject: (token: string, batchId: number, data: { subject_id: number; teacher_id: number | null; days: string[]; start_time: string; end_time: string }) =>
    request<{ message: string }>(`/admin/batches/${batchId}/subjects`, {
      method: "POST", body: JSON.stringify(data), token,
    }),

  updateSubjectEntry: (token: string, batchId: number, entryId: number, data: { subject_id: number; teacher_id: number | null; days: string[]; start_time: string; end_time: string }) =>
    request<{ message: string }>(`/admin/batches/${batchId}/subjects/${entryId}`, {
      method: "PUT", body: JSON.stringify(data), token,
    }),

  unassignSubject: (token: string, batchId: number, entryId: number) =>
    request<{ message: string }>(`/admin/batches/${batchId}/subjects/${entryId}`, { method: "DELETE", token }),

  directEnroll: (token: string, data: { user_id?: number; mobile: string; course_id: number; batch_id: number; amount: number; full_name?: string; student_id?: string; gender?: string; student_class?: string; school?: string; shift?: string; father_name?: string; father_mobile?: string; mother_name?: string; mother_mobile?: string; notification_mobile?: string; address?: string; payment_method?: string; reference?: string }) =>
    request<Enrollment>("/admin/enrollments/direct", { method: "POST", body: JSON.stringify(data), token }),
};

export interface SearchUser {
  id: number;
  full_name: string;
  mobile: string;
  student_class: string;
  father_name: string;
  father_mobile: string;
  verified: boolean;
  batches: string[];
}

export const userSearchApi = {
  searchUsers: (token: string, q: string) =>
    request<SearchUser[]>(`/admin/users/search?q=${encodeURIComponent(q)}`, { token }),
};

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  date: string;
  status: string;
  marked_by: number;
  marked_by_name: string;
  notes: string;
  created_at: string;
}

export interface AttendanceReport {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  attendance_rate: number;
}

export interface Holiday {
  id: number;
  date: string;
  reason: string;
  created_at: string;
}

export const attendanceApi = {
  getStudents: (token: string, batchId?: number) => {
    const qs = batchId ? `?batch_id=${batchId}` : "";
    return request<User[]>(`/admin/students${qs}`, { token });
  },

  markAttendance: (token: string, data: { date: string; entries: { student_id: number; status: string; notes: string }[] }) =>
    request<{ imported: number; skipped: number; message: string }>("/admin/attendance", {
      method: "POST", body: JSON.stringify(data), token,
    }),

  getAttendance: (token: string, date: string, batchId?: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (batchId) params.set("batch_id", batchId);
    return request<AttendanceRecord[]>(`/admin/attendance?${params.toString()}`, { token });
  },

  getReport: (token: string, date: string, batchId?: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (batchId) params.set("batch_id", batchId);
    return request<AttendanceReport>(`/admin/attendance/report?${params.toString()}`, { token });
  },

  getStudentAttendance: (token: string, studentId: number) =>
    request<AttendanceRecord[]>(`/admin/attendance?student_id=${studentId}`, { token }),

  getHolidays: (token: string) =>
    request<Holiday[]>("/admin/holidays", { token }),

  createHoliday: (token: string, data: { date: string; reason: string }) =>
    request<Holiday>("/admin/holidays", { method: "POST", body: JSON.stringify(data), token }),

  deleteHoliday: (token: string, id: number) =>
    request<{ message: string }>(`/admin/holidays/${id}`, { method: "DELETE", token }),
};

export interface Doubt {
  id: number;
  student_id: number;
  student_name: string;
  question_text: string;
  subject: string;
  chapter: string;
  image_url: string;
  status: string;
  resolution: string;
  resolved_by: number;
  resolved_by_name: string;
  resolved_at: string | null;
  parent_notified: boolean;
  student_notified: boolean;
  created_at: string;
}

export interface DoubtStats {
  total: number;
  pending: number;
  resolved: number;
  closed: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  event_type: string;
  date: string;
  end_date: string;
  course_id: number;
  course_name: string;
  batch_id: number;
  batch_name: string;
  color: string;
  is_auto: boolean;
  notification_sent: boolean;
  created_by: number;
  created_at: string;
}

export interface Lesson {
  id: number;
  course_id: number;
  course_name: string;
  batch_id: number;
  batch_name: string;
  title: string;
  description: string;
  subject: string;
  chapter: string;
  lesson_date: string;
  teacher_notes: string;
  created_by: number;
  created_at: string;
}

export interface Payment {
  id: number;
  user_id: number;
  user_name: string;
  user_mobile: string;
  enrollment_id: number;
  course_id: number;
  course_name: string;
  amount: number;
  method: string;
  transaction_id: string;
  sender_number: string;
  receiver_number: string;
  status: string;
  receipt_number: string;
  month: string;
  year: number;
  notes: string;
  verified_by: number;
  verified_by_name: string;
  verified_at: string | null;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  video_url: string;
  image_url: string;
  is_published: boolean;
  created_by: number;
  created_at: string;
}

export const doubtApi = {
  getDoubts: (token: string, status?: string, studentId?: number, batchId?: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (studentId) params.set("student_id", String(studentId));
    if (batchId) params.set("batch_id", String(batchId));
    const qs = params.toString();
    return request<Doubt[]>(`/admin/doubts${qs ? `?${qs}` : ""}`, { token });
  },
  getStats: (token: string) => request<DoubtStats>("/admin/doubts/stats", { token }),
  resolve: (token: string, id: number, resolution: string) =>
    request<{ message: string }>(`/admin/doubts/${id}/resolve`, { method: "PUT", body: JSON.stringify({ resolution }), token }),
  close: (token: string, id: number) =>
    request<{ message: string }>(`/admin/doubts/${id}/close`, { method: "PUT", token }),
};

export const calendarApi = {
  getEvents: (token: string, month?: string) => {
    const params = month ? `?month=${month}` : "";
    return request<CalendarEvent[]>(`/admin/calendar${params}`, { token });
  },
  createEvent: (token: string, data: { title: string; description: string; event_type: string; date: string; end_date?: string; course_id?: number; batch_id?: number; color?: string }) =>
    request<CalendarEvent>("/admin/calendar", { method: "POST", body: JSON.stringify(data), token }),
  updateEvent: (token: string, id: number, data: { title: string; description: string; event_type: string; date: string; end_date?: string; course_id?: number; batch_id?: number; color?: string }) =>
    request<{ message: string }>(`/admin/calendar/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteEvent: (token: string, id: number) =>
    request<{ message: string }>(`/admin/calendar/${id}`, { method: "DELETE", token }),
};

export const lessonApi = {
  getLessons: (token: string, batchId?: number) => {
    const qs = batchId ? `?batch_id=${batchId}` : "";
    return request<Lesson[]>(`/admin/lessons${qs}`, { token });
  },
  getTodayLessons: (token: string, batchId?: number) => {
    const qs = batchId ? `?batch_id=${batchId}` : "";
    return request<Lesson[]>(`/admin/lessons/today${qs}`, { token });
  },
  createLesson: (token: string, data: { course_id: number; batch_id?: number; title: string; description?: string; subject?: string; chapter?: string; lesson_date: string; teacher_notes?: string }) =>
    request<Lesson>("/admin/lessons", { method: "POST", body: JSON.stringify(data), token }),
  updateLesson: (token: string, id: number, data: { course_id: number; batch_id?: number; title: string; description?: string; subject?: string; chapter?: string; lesson_date: string; teacher_notes?: string }) =>
    request<{ message: string }>(`/admin/lessons/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteLesson: (token: string, id: number) =>
    request<{ message: string }>(`/admin/lessons/${id}`, { method: "DELETE", token }),
};

export const paymentApi = {
  getPayments: (token: string, status?: string, userId?: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (userId) params.set("user_id", String(userId));
    const qs = params.toString();
    return request<Payment[]>(`/admin/payments${qs ? `?${qs}` : ""}`, { token });
  },
  createPayment: (token: string, data: { user_id: number; enrollment_id?: number; course_id?: number; amount: number; method: string; transaction_id?: string; sender_number?: string; receiver_number?: string; month?: string; year?: number; notes?: string }) =>
    request<Payment>("/admin/payments", { method: "POST", body: JSON.stringify(data), token }),
  verify: (token: string, id: number) =>
    request<{ message: string }>(`/admin/payments/${id}/verify`, { method: "PUT", token }),
  reject: (token: string, id: number) =>
    request<{ message: string }>(`/admin/payments/${id}/reject`, { method: "PUT", token }),
  deletePayment: (token: string, id: number) =>
    request<{ message: string }>(`/admin/payments/${id}`, { method: "DELETE", token }),
};

export const articleApi = {
  getArticles: (token: string) => request<Article[]>("/admin/articles", { token }),
  createArticle: (token: string, data: { title: string; content: string; category?: string; video_url?: string; image_url?: string }) =>
    request<Article>("/admin/articles", { method: "POST", body: JSON.stringify(data), token }),
  updateArticle: (token: string, id: number, data: { title: string; content: string; category?: string; video_url?: string; image_url?: string }) =>
    request<{ message: string }>(`/admin/articles/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteArticle: (token: string, id: number) =>
    request<{ message: string }>(`/admin/articles/${id}`, { method: "DELETE", token }),
  togglePublish: (token: string, id: number) =>
    request<{ message: string }>(`/admin/articles/${id}/toggle`, { method: "PUT", token }),
};

export const notificationApi = {
  getStats: (token: string) =>
    request<{ total_users: number; total_devices: number; android: number; ios: number; total_sent: number }>("/admin/notifications/stats", { token }),
  getDevices: (token: string, userId?: number) => {
    const q = userId ? `?user_id=${userId}` : "";
    return request<{ devices: Array<{ id: number; user_id: number; user_name: string; platform: string; created_at: string }>; total: number }>(`/admin/notifications/devices${q}`, { token });
  },
  send: (token: string, data: { title: string; body: string; user_id?: number; batch_id?: number; all_users?: boolean; link_type?: string; link_id?: number }) =>
    request<{ message: string; target: string; total: number; success: number; failure: number; notification_id: number }>("/admin/notifications/send", { method: "POST", body: JSON.stringify(data), token }),
  getHistory: (token: string, page = 1, limit = 20, filter?: { target: string; targetId: number }) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filter) {
      q.set("target", filter.target);
      q.set("target_id", String(filter.targetId));
    }
    return request<{ notifications: Array<{ id: number; title: string; body: string; target: string; target_id: number; link_type: string; link_id: number; sent_by: number; sent_at: string }>; total: number; page: number; limit: number }>(`/admin/notifications/history?${q.toString()}`, { token });
  },
  deleteNotification: (token: string, id: number) =>
    request<{ message: string }>(`/admin/notifications/${id}`, { method: "DELETE", token }),
};

export interface Note {
  id: number;
  class_level: string;
  subject: string;
  title: string;
  content: string;
  tags: string[];
  is_published: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export const notesApi = {
  getNotes: (token: string, classLevel?: string, subject?: string) => {
    const params = new URLSearchParams();
    if (classLevel) params.set("class_level", classLevel);
    if (subject) params.set("subject", subject);
    const q = params.toString();
    return request<Note[]>(`/admin/notes${q ? `?${q}` : ""}`, { token });
  },
  createNote: (token: string, data: { class_level: string; subject: string; title: string; content: string; tags?: string[]; is_published?: boolean }) =>
    request<{ id: number }>("/admin/notes", { method: "POST", body: JSON.stringify(data), token }),
  updateNote: (token: string, id: number, data: { class_level: string; subject: string; title: string; content: string; tags?: string[]; is_published?: boolean }) =>
    request<{ message: string }>(`/admin/notes/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteNote: (token: string, id: number) =>
    request<{ message: string }>(`/admin/notes/${id}`, { method: "DELETE", token }),
};

export interface PromoCode {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  course_id: number | null;
  course_name?: string;
  batch_id: number | null;
  batch_name?: string;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromoCodePayload {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  course_id?: number | null;
  batch_id?: number | null;
  max_redemptions?: number | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export const promoCodeApi = {
  list: (token: string) => request<PromoCode[]>("/admin/promo-codes", { token }),
  create: (token: string, data: PromoCodePayload) =>
    request<{ id: number }>("/admin/promo-codes", { method: "POST", body: JSON.stringify(data), token }),
  update: (token: string, id: number, data: PromoCodePayload) =>
    request<{ message: string }>(`/admin/promo-codes/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  delete: (token: string, id: number) =>
    request<{ message: string }>(`/admin/promo-codes/${id}`, { method: "DELETE", token }),
};

export interface DailyContentItem {
  id: number;
  content_type: string;
  class_level: string;
  title: string;
  body: string;
  answer: string;
  language: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
}

export const dailyContentApi = {
  getContent: (token: string, contentType?: string, classLevel?: string) => {
    const params = new URLSearchParams();
    if (contentType) params.set("content_type", contentType);
    if (classLevel) params.set("class_level", classLevel);
    const q = params.toString();
    return request<DailyContentItem[]>(`/admin/daily-content${q ? `?${q}` : ""}`, { token });
  },
  createContent: (token: string, data: { content_type: string; class_level: string; title: string; body: string; answer?: string; language?: string }) =>
    request<{ id: number }>("/admin/daily-content", { method: "POST", body: JSON.stringify(data), token }),
  updateContent: (token: string, id: number, data: { content_type: string; class_level: string; title: string; body: string; answer?: string; language?: string }) =>
    request<{ message: string }>(`/admin/daily-content/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteContent: (token: string, id: number) =>
    request<{ message: string }>(`/admin/daily-content/${id}`, { method: "DELETE", token }),
};

export const examsApi = {
  toggleLive: (token: string, examId: number, isLive: boolean) =>
    request<{ message: string; is_live: boolean }>(`/admin/exams/${examId}/live`, { method: "PUT", body: JSON.stringify({ is_live: isLive }), token }),
};

export interface Result {
  id: number;
  user_id: number;
  student_name: string;
  student_class: string;
  subject: string;
  exam_name: string;
  exam_date: string;
  marks_obtained: number;
  marks_total: number;
  percentage: number;
  remarks: string;
  created_at: string;
}

export interface ResultInput {
  user_id: number;
  subject: string;
  exam_name: string;
  exam_date: string;
  marks_obtained: number;
  marks_total: number;
  remarks?: string;
}

export const resultApi = {
  getResults: (token: string, userId?: number, batchId?: number) => {
    const params = new URLSearchParams();
    if (userId) params.set("user_id", String(userId));
    if (batchId) params.set("batch_id", String(batchId));
    const qs = params.toString();
    return request<Result[]>(`/admin/results${qs ? `?${qs}` : ""}`, { token });
  },
  createResult: (token: string, data: ResultInput) =>
    request<{ id: number }>("/admin/results", { method: "POST", body: JSON.stringify(data), token }),
  updateResult: (token: string, id: number, data: ResultInput) =>
    request<{ message: string }>(`/admin/results/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteResult: (token: string, id: number) =>
    request<{ message: string }>(`/admin/results/${id}`, { method: "DELETE", token }),
};

export interface StudentTransition {
  id: number;
  user_id: number;
  user_name: string;
  from_class: string;
  to_class: string;
  gpa: number;
  subjects: string;
  result_notes: string;
  submitted_at: string;
}

export const transitionApi = {
  getTransitions: (token: string) =>
    request<StudentTransition[]>("/admin/transitions", { token }),
};

export interface VocabularyWord {
  id: number;
  class_level: string;
  word: string;
  meaning: string;
  meaning_bn: string;
  example_sentence: string;
  pronunciation: string;
  created_at: string;
}

export interface VocabularyInput {
  class_level: string;
  word: string;
  meaning: string;
  meaning_bn?: string;
  example_sentence?: string;
  pronunciation?: string;
}

export const vocabularyApi = {
  getWords: (token: string, classLevel?: string) => {
    const q = classLevel ? `?class_level=${classLevel}` : "";
    return request<VocabularyWord[]>(`/admin/vocabulary${q}`, { token });
  },
  createWord: (token: string, data: VocabularyInput) =>
    request<{ id: number }>("/admin/vocabulary", { method: "POST", body: JSON.stringify(data), token }),
  updateWord: (token: string, id: number, data: VocabularyInput) =>
    request<{ message: string }>(`/admin/vocabulary/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteWord: (token: string, id: number) =>
    request<{ message: string }>(`/admin/vocabulary/${id}`, { method: "DELETE", token }),
};

export interface SentenceExercise {
  id: number;
  class_level: string;
  prompt: string;
  sample_answer: string;
  created_at: string;
}

export interface SentenceExerciseInput {
  class_level: string;
  prompt: string;
  sample_answer?: string;
}

export const sentenceExerciseApi = {
  getExercises: (token: string, classLevel?: string) => {
    const q = classLevel ? `?class_level=${classLevel}` : "";
    return request<SentenceExercise[]>(`/admin/sentence-exercises${q}`, { token });
  },
  createExercise: (token: string, data: SentenceExerciseInput) =>
    request<{ id: number }>("/admin/sentence-exercises", { method: "POST", body: JSON.stringify(data), token }),
  updateExercise: (token: string, id: number, data: SentenceExerciseInput) =>
    request<{ message: string }>(`/admin/sentence-exercises/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteExercise: (token: string, id: number) =>
    request<{ message: string }>(`/admin/sentence-exercises/${id}`, { method: "DELETE", token }),
};

export interface OMRPoint {
  x_mm: number;
  y_mm: number;
}

export interface OMRQuestionBubble {
  question_number: number;
  option: number;
  center: OMRPoint;
}

export interface OMRDigitBubble {
  digit: number;
  value: number;
  center: OMRPoint;
}

export interface OMRTemplate {
  page_width_mm: number;
  page_height_mm: number;
  marker_size_mm: number;
  bubble_diameter_mm: number;
  columns: number;
  markers: [OMRPoint, OMRPoint, OMRPoint, OMRPoint];
  roll_digit_count: number;
  roll_bubbles: OMRDigitBubble[];
  exam_code_digit_count: number;
  exam_code_bubbles: OMRDigitBubble[];
  question_bubbles: OMRQuestionBubble[];
  content_left_mm: number;
  content_right_mm: number;
  content_top_mm: number;
  info_row_top_mm: number;
  questions_top_mm: number;
  warning_bar_height_mm: number;
  title_height_mm: number;
  info_row_height_mm: number;
  section_title_height_mm: number;
  class_box_left_mm: number;
  class_box_width_mm: number;
  roll_box_left_mm: number;
  roll_box_width_mm: number;
  subject_code_box_left_mm: number;
  subject_code_box_width_mm: number;
  set_box_left_mm: number;
  set_box_width_mm: number;
}

export interface OMRDesign {
  id: number;
  title: string;
  class_level: string;
  subject: string;
  question_count: number;
  columns: number;
  token_count: number;
  created_at: string;
  updated_at: string;
}

export interface OMRExam {
  id: number;
  title: string;
  class_level: string;
  subject: string;
  question_count: number;
  columns: number;
  exam_code: string;
  omr_design_id: number | null;
  answer_key_set: boolean;
  student_count: number;
  sheet_count: number;
  created_at: string;
  updated_at: string;
}

export interface OMRQuestion {
  id: number;
  omr_exam_id: number;
  question_number: number;
  correct_option: number | null;
}

export interface OMRStudent {
  id: number;
  omr_exam_id: number;
  roll_number: string;
  name: string;
  enrollment_id: number | null;
}

export interface OMRQuestionOutcome {
  question_number: number;
  selected_option: number;
  correct_option: number;
  correct: boolean;
  ambiguous: boolean;
}

export interface OMRSheet {
  id: number;
  omr_exam_id: number;
  // Only set in the response to uploadSheet/uploadSheetWithProgress — a data:
  // URL of the marked-up sheet, generated in memory and never stored, so a
  // later listSheets/getSheet won't have it.
  annotated_preview?: string;
  detected_roll_number: string;
  matched_student_id: number | null;
  matched_student_name?: string;
  status: "scored" | "needs_review" | "unreadable";
  score: number;
  total_questions: number;
  detected_exam_code?: string;
  exam_code_mismatch?: boolean;
  roll_ambiguous?: boolean;
  questions?: OMRQuestionOutcome[];
  student_result_id: number | null;
  gradebook_synced: boolean;
  created_at: string;
}

export const omrApi = {
  checkScannable: (token: string, questionCount: number, columns: number) =>
    request<{ scannable: boolean; reason: string; columns: number }>(
      `/admin/omr/check?question_count=${questionCount}&columns=${columns}`,
      { token }
    ),
  previewTemplate: (token: string, questionCount: number, columns: number) =>
    request<{ template: OMRTemplate }>(`/admin/omr/template-preview?question_count=${questionCount}&columns=${columns}`, { token }),
  createDesign: (
    token: string,
    data: { title: string; class_level?: string; subject?: string; columns?: number; question_count: number }
  ) => request<OMRDesign>("/admin/omr/designs", { method: "POST", body: JSON.stringify(data), token }),
  listDesigns: (token: string) => request<OMRDesign[]>("/admin/omr/designs", { token }),
  getDesign: (token: string, id: number) => request<OMRDesign>(`/admin/omr/designs/${id}`, { token }),
  updateDesign: (
    token: string,
    id: number,
    data: { title: string; class_level?: string; subject?: string; columns?: number; question_count: number }
  ) => request<OMRDesign>(`/admin/omr/designs/${id}`, { method: "PUT", body: JSON.stringify(data), token }),
  deleteDesign: (token: string, id: number) => request<{ deleted: boolean }>(`/admin/omr/designs/${id}`, { method: "DELETE", token }),
  createToken: (token: string, data: { title: string; omr_design_id: number }) =>
    request<OMRExam>("/admin/omr/exams", { method: "POST", body: JSON.stringify(data), token }),
  listExams: (token: string) => request<OMRExam[]>("/admin/omr/exams", { token }),
  updateToken: (token: string, id: number, title: string) =>
    request<{ updated: boolean }>(`/admin/omr/exams/${id}`, { method: "PUT", body: JSON.stringify({ title }), token }),
  deleteToken: (token: string, id: number) => request<{ deleted: boolean }>(`/admin/omr/exams/${id}`, { method: "DELETE", token }),
  getExam: (token: string, id: number) =>
    request<{ exam: OMRExam; questions: OMRQuestion[]; students: OMRStudent[] }>(`/admin/omr/exams/${id}`, { token }),
  getTemplate: (token: string, id: number) =>
    request<{ template: OMRTemplate; exam_code: string }>(`/admin/omr/exams/${id}/template`, { token }),
  updateAnswerKey: (token: string, id: number, questions: { question_number: number; correct_option: number }[]) =>
    request<{ updated: number }>(`/admin/omr/exams/${id}/questions`, { method: "PUT", body: JSON.stringify({ questions }), token }),
  addStudents: (token: string, id: number, students: { roll_number: string; name?: string }[]) =>
    request<{ added: number }>(`/admin/omr/exams/${id}/students`, {
      method: "POST",
      body: JSON.stringify({ students }),
      token,
    }),
  importRoster: (token: string, id: number, batchId: number) =>
    request<{ imported: number; without_login: number }>(`/admin/omr/exams/${id}/import-roster`, {
      method: "POST",
      body: JSON.stringify({ batch_id: batchId }),
      token,
    }),
  listSheets: (token: string, examId: number) => request<OMRSheet[]>(`/admin/omr/exams/${examId}/sheets`, { token }),
  getSheet: (token: string, examId: number, sheetId: number) =>
    request<OMRSheet>(`/admin/omr/exams/${examId}/sheets/${sheetId}`, { token }),
  updateSheet: (
    token: string,
    examId: number,
    sheetId: number,
    corrections: { corrections: { question_number: number; corrected_option: number }[]; matched_student_id?: number }
  ) =>
    request<OMRSheet>(`/admin/omr/exams/${examId}/sheets/${sheetId}`, {
      method: "PATCH",
      body: JSON.stringify(corrections),
      token,
    }),
  deleteSheet: (token: string, examId: number, sheetId: number) =>
    request<{ deleted: boolean }>(`/admin/omr/exams/${examId}/sheets/${sheetId}`, { method: "DELETE", token }),
  // Uses XMLHttpRequest instead of fetch so the caller can track real
  // upload progress (fetch has no cross-browser upload-progress event) —
  // matters here since sheet photos from a phone camera can be a few MB.
  uploadSheetWithProgress: (token: string, image: File, examId: number | undefined, onProgress: (pct: number) => void) => {
    const formData = new FormData();
    formData.append("image", image);
    if (examId) formData.append("exam_id", String(examId));
    return new Promise<OMRSheet>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/admin/omr/sheets`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: unknown;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error("Invalid response from server"));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as OMRSheet);
        } else {
          const message = (data as { error?: string })?.error || "Request failed";
          reject(new Error(message));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  },
};
