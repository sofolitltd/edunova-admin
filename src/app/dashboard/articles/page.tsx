"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserToken, isUserAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";
import { BookOpen, Play, ChevronRight, Loader2 } from "lucide-react";

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  video_url: string;
  image_url: string;
  created_at: string;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "screen_time", label: "Screen Time" },
  { key: "teen_parenting", label: "Teen Parenting" },
  { key: "exam_stress", label: "Exam Stress" },
  { key: "mental_health", label: "Mental Health" },
  { key: "study_habits", label: "Study Habits" },
  { key: "child-development", label: "Child Development" },
];

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    const token = getUserToken();
    if (!token) return;

    api
      .getPublishedArticles(token)
      .then((data) => setArticles(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const filtered =
    activeCategory === "all"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "screen_time":
        return "bg-destructive/10 text-destructive";
      case "teen_parenting":
        return "bg-primary/10 text-primary";
      case "exam_stress":
        return "bg-warning/10 text-warning";
      case "mental_health":
        return "bg-success/10 text-success";
      case "study_habits":
        return "bg-accent/10 text-accent";
      case "child-development":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryLabel = (category: string) => {
    const found = CATEGORIES.find((c) => c.key === category);
    return found ? found.label : category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading articles...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Parenting Hub</h1>
        <p className="text-muted-foreground mt-1">
          Tips, wellness &amp; expert advice for parents
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground shadow-primary"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Articles */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border px-6 py-16 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No articles found in this category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article) => {
            const preview = article.content.length > 150
              ? article.content.slice(0, 150) + "..."
              : article.content;

            return (
              <div
                key={article.id}
                onClick={() => router.push(`/dashboard/articles/${article.id}`)}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              >
                {article.image_url && (
                  <div className="h-44 overflow-hidden">
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                  {/* Category Badge + Video */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBadge(
                        article.category
                      )}`}
                    >
                      {getCategoryLabel(article.category)}
                    </span>
                    {article.video_url && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                        <Play className="w-3 h-3" />
                        Video
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>

                  {/* Content Preview */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {preview}
                  </p>

                  {/* Read more */}
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                    Read more
                    <ChevronRight className="w-4 h-4" />
                  </span>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground pt-3 mt-3 border-t border-border">
                    {formatDate(article.created_at)}
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
