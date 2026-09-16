"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUserToken, isUserAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  video_url: string;
  image_url: string;
  created_at: string;
}

export default function ArticleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    const token = getUserToken();
    if (!token) return;

    api
      .getPublishedArticles(token)
      .then((data) => {
        const found = data.find((a) => a.id === id);
        setArticle(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, router]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading article...
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-muted-foreground mb-4">Article not found</p>
        <button
          onClick={() => router.push("/dashboard/articles")}
          className="text-primary hover:underline"
        >
          Back to articles
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.push("/dashboard/articles")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to articles
      </button>

      {article.image_url && (
        <div className="rounded-2xl overflow-hidden mb-6 border border-border">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4">
          {article.category.replace(/_/g, " ")}
        </span>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
          {article.title}
        </h1>

        <p className="text-xs text-muted-foreground mb-6">
          {formatDate(article.created_at)}
        </p>

        {article.video_url && (
          <div className="mb-6 rounded-xl overflow-hidden border border-border">
            <iframe
              src={article.video_url}
              className="w-full aspect-video"
              allowFullScreen
            />
          </div>
        )}

        <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-line">
          {article.content}
        </div>
      </div>
    </div>
  );
}
