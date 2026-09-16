"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserToken, isUserAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";
import { BookOpen, Calendar, FileText, Inbox } from "lucide-react";

interface TodayLesson {
  id: number;
  course_id: number;
  course_name: string;
  title: string;
  description: string;
  subject: string;
  chapter: string;
  lesson_date: string;
}

export default function TodayLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<TodayLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    const token = getUserToken();
    if (!token) return;

    api.getTodayLessons(token)
      .then((data) => setLessons(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading today&apos;s lessons...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Today&apos;s Lessons</h1>
        <p className="text-muted-foreground mt-1">{today}</p>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border px-6 py-16 text-center">
          <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No lessons scheduled for today</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Check back later for updates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {lesson.course_name}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{lesson.subject}</span>
                </div>
                {lesson.chapter && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{lesson.chapter}</span>
                  </div>
                )}
              </div>

              {lesson.description && (
                <p className="mt-3 text-xs text-muted-foreground/80 line-clamp-2">
                  {lesson.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
