"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserToken, isUserAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";
import { Calendar, Clock, Sun, BookOpen } from "lucide-react";

interface UpcomingEvent {
  id: number;
  title: string;
  description: string;
  event_type: string;
  date: string;
  color: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }

    const token = getUserToken();
    if (!token) return;

    api.getUpcomingEvents(token)
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const getEventStyle = (type: string) => {
    switch (type) {
      case "exam":
        return {
          border: "border-l-red-500",
          bg: "bg-red-500/5",
          badge: "bg-red-500/10 text-red-600",
          icon: <Clock className="w-4 h-4 text-red-500" />,
        };
      case "holiday":
        return {
          border: "border-l-amber-500",
          bg: "bg-amber-500/5",
          badge: "bg-amber-500/10 text-amber-600",
          icon: <Sun className="w-4 h-4 text-amber-500" />,
        };
      case "class_test":
        return {
          border: "border-l-blue-500",
          bg: "bg-blue-500/5",
          badge: "bg-blue-500/10 text-blue-600",
          icon: <BookOpen className="w-4 h-4 text-blue-500" />,
        };
      default:
        return {
          border: "border-l-gray-400",
          bg: "bg-gray-400/5",
          badge: "bg-gray-400/10 text-gray-600",
          icon: <Calendar className="w-4 h-4 text-gray-500" />,
        };
    }
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        day: date.toLocaleDateString("en-US", { day: "numeric" }),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      };
    } catch {
      return { day: dateStr, month: "", weekday: "" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading upcoming events...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Upcoming Events</h1>
        <p className="text-muted-foreground mt-1">Stay on top of exams, holidays, and class tests</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border px-6 py-16 text-center">
          <Calendar className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No upcoming events</h3>
          <p className="text-muted-foreground text-sm">
            There are no scheduled exams, holidays, or class tests at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const style = getEventStyle(event.event_type);
            const dateInfo = formatEventDate(event.date);

            return (
              <div
                key={event.id}
                className={`bg-card rounded-2xl border border-border overflow-hidden ${style.border} border-l-4 ${style.bg}`}
              >
                <div className="flex items-start gap-5 p-5">
                  {/* Date block */}
                  <div className="flex flex-col items-center justify-center min-w-[64px] text-center">
                    <span className="text-2xl font-bold text-foreground leading-none">
                      {dateInfo.day}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase mt-0.5">
                      {dateInfo.month}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {dateInfo.weekday}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="w-px bg-border self-stretch" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {style.icon}
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {event.title}
                      </h3>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {event.description}
                      </p>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${style.badge}`}
                    >
                      {event.event_type.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
