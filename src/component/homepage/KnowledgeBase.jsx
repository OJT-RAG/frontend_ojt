// Plain JSX component (no Tailwind; uses local .kb-* CSS rules)
import React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  BookOpen,
  FileText,
  Users,
  Building,
  Calendar,
  Search,
  ArrowRight,
  Clock,
  Download
} from "lucide-react";
import "./KnowledgeBase.css";
import { useI18n } from "../../i18n/i18n.jsx";

const KnowledgeBase = () => {
  const { t } = useI18n();

  const categories = [
    {
      icon: FileText,
      title: t("kb_cat_policies_title"),
      description: t("kb_cat_policies_desc"),
      count: 24,
      color: "kb-cat-primary"
    },
    {
      icon: Calendar,
      title: t("kb_cat_application_title"),
      description: t("kb_cat_application_desc"),
      count: 18,
      color: "kb-cat-accent"
    },
    {
      icon: Building,
      title: t("kb_cat_companies_title"),
      description: t("kb_cat_companies_desc"),
      count: 156,
      color: "kb-cat-primary"
    },
    {
      icon: Users,
      title: t("kb_cat_mentors_title"),
      description: t("kb_cat_mentors_desc"),
      count: 12,
      color: "kb-cat-accent"
    }
  ];

  const recentUpdates = [
    {
      title: t("kb_ru_1_title"),
      date: t("kb_ru_1_date"),
      type: t("kb_ru_1_type")
    },
    {
      title: t("kb_ru_2_title"),
      date: t("kb_ru_2_date"),
      type: t("kb_ru_2_type")
    },
    {
      title: t("kb_ru_3_title"),
      date: t("kb_ru_3_date"),
      type: t("kb_ru_3_type")
    }
  ];

  return (
    <section className="kb-root">
      <div className="kb-container">
        {/* Header */}
        <div className="kb-header">
          <Badge variant="secondary" className="kb-badge">
            <BookOpen className="kb-badge-icon" />
            {t("kb_hub")}
          </Badge>

          <h2 className="kb-title">
            {t("kb_title").split(" ").slice(0, 1).join(" ") || "Comprehensive"}{" "}
            <span className="kb-title-gradient">
              {t("kb_title").replace("Comprehensive ", "")}
            </span>
          </h2>

          <p className="kb-sub">{t("kb_sub")}</p>
        </div>

        {/* Search */}
        <div className="kb-search">
          <div className="kb-search-inner">
            <Search className="kb-search-icon" />
            <Input
              placeholder={t("kb_search_placeholder")}
              className="kb-input"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="kb-grid">
          {categories.map((cat, idx) => (
            <Card key={idx} className="kb-card">
              <div className={`kb-cat ${cat.color}`}>
                <cat.icon className="kb-icon" />
              </div>
              <h3 className="kb-cat-title">{cat.title}</h3>
              <p className="kb-cat-desc">{cat.description}</p>
              <div className="kb-card-footer">
                <Badge variant="outline" className="kb-count">
                  {cat.count} {t("kb_items")}
                </Badge>
                <ArrowRight className="kb-arrow" />
              </div>
            </Card>
          ))}
        </div>

        {/* Recent Updates – FULL WIDTH */}
        <div className="kb-panels kb-panels-single">
          <Card className="kb-panel">
            <div className="kb-panel-header">
              <h3 className="kb-panel-title">
                {t("kb_recent_updates")}
              </h3>
              <Button variant="ghost" size="sm" className="kb-viewall">
                {t("kb_view_all")}
                <ArrowRight className="kb-arrow-sm" />
              </Button>
            </div>

            <div className="kb-panel-body">
              {recentUpdates.map((item, idx) => (
                <div key={idx} className="kb-update kb-update-download">
                  <div className="kb-update-left">
                    <div className="kb-update-icon">
                      <FileText className="kb-icon-small" />
                    </div>

                    <div className="kb-update-content">
                      <h4 className="kb-update-title">{item.title}</h4>
                      <div className="kb-update-meta">
                        <Badge
                          variant="outline"
                          className="kb-meta-badge"
                        >
                          {item.type}
                        </Badge>
                        <span className="kb-dot">•</span>
                        <div className="kb-meta-time">
                          <Clock className="kb-meta-icon" />
                          {item.date}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="kb-download-btn"
                    title={t("kb_download")}
                  >
                    <Download className="kb-icon-sm" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBase;