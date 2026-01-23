// Plain JSX component (no Tailwind; uses local .kb-* CSS rules)
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
import documentApi from "../API/OjtDocumentAPI.js"
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const timeAgo = (dateString) => {
  if (!dateString) return "";

  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  
  if (seconds < 60) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return `${months} tháng trước`;
};

const KnowledgeBase = () => {
  const { t } = useI18n();
  const [recentUpdates, setRecentUpdates] = useState([]);

  const kbTitle = (t("kb_title") || "").trim();
  const kbTitleParts = kbTitle.split(/\s+/).filter(Boolean);
  const kbTitleFirst = kbTitleParts[0] || "";
  const kbTitleRest = kbTitleParts.length > 1 ? kbTitleParts.slice(1).join(" ") : "";
  const navigate = useNavigate();
  const [categoryCounts, setCategoryCounts] = useState({});

  const categoriesConfig = [
  {
    key: "system",
    icon: FileText,
    title: t("kb_cat_policies_title"),
    description: t("kb_cat_policies_desc"),
    color: "kb-cat-primary"
  },
  {
    key: "university",
    icon: Calendar,
    title: t("kb_cat_application_title"),
    description: t("kb_cat_application_desc"),
    color: "kb-cat-accent"
  },
  {
    key: "company",
    icon: Building,
    title: t("kb_cat_companies_title"),
    description: t("kb_cat_companies_desc"),
    color: "kb-cat-primary"
  }
];
useEffect(() => {
  loadCategoryCounts();
}, []);

const loadCategoryCounts = async () => {
  try {
    const results = await Promise.all(
      categoriesConfig.map(cat =>
        documentApi.getByTagType(cat.key)
      )
    );

    const counts = {};

    results.forEach((res, idx) => {
      const tagKey = categoriesConfig[idx].key;
        console.log(
    "TAG:",
    categoriesConfig[idx].key,
    "STATUS:",
    res?.status,
    "DATA:",
    res?.data
  );
      const raw = res?.data;
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      counts[tagKey] = data.length;
    });

    setCategoryCounts(counts);
  } catch (err) {
    console.error("Load category counts failed", err);
  }
};


useEffect(() => {
  loadRecentUpdates();
}, []);

const loadRecentUpdates = async () => {
  try {
    const res = await documentApi.getAll();

    const data = Array.isArray(res.data)
      ? res.data
      : res.data?.data || [];

    const latestThree = data
      .filter(d => d.title && d.fileUrl && d.uploadedAt)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )
      .slice(0, 3)
      .map(d => ({
  title: d.title,
  fileUrl: d.fileUrl,
  uploadedAt: d.uploadedAt
}));


    setRecentUpdates(latestThree);
  } catch (err) {
    console.error("Load recent updates failed", err);
  }
};


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
            {kbTitleRest ? `${kbTitleFirst} ` : ""}
            <span className="kb-title-gradient">{kbTitleRest || kbTitle || "Comprehensive Knowledge Base"}</span>
          </h2>

          <p className="kb-sub">{t("kb_sub")}</p>
        </div>

        {/* Categories */}
        <div className="kb-grid">
  {categoriesConfig.map((cat) => (
    <Card
      key={cat.key}
      className="kb-card"
      onClick={() => navigate(`/ojt?tag=${cat.key}`)}
      style={{ cursor: "pointer" }}
    >
      <div className={`kb-cat ${cat.color}`}>
        <cat.icon className="kb-icon" />
      </div>

      <h3 className="kb-cat-title">{cat.title}</h3>
      <p className="kb-cat-desc">{cat.description}</p>

      <div className="kb-card-footer">
        <Badge variant="outline" className="kb-count">
          {categoryCounts[cat.key] ?? 0} {t("kb_items")}
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
              <Button
  variant="ghost"
  size="sm"
  className="kb-viewall"
  onClick={() => navigate("/ojt")}
>
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
  <a
    href={item.fileUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="kb-update-title kb-update-link"
  >
    {item.title}
  </a>

  <div className="kb-update-time">
    <Clock className="kb-meta-icon" />
    {timeAgo(item.uploadedAt)}
  </div>
</div>

      </div>

      <Button
        variant="ghost"
        size="sm"
        className="kb-download-btn"
        title={t("kb_download")}
        asChild
      >
        <a
          href={item.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download className="kb-icon-sm" />
        </a>
      </Button>
    </div>
  ))}

  {recentUpdates.length === 0 && (
    <div className="kb-empty">
      {t("kb_no_updates")}
    </div>
  )}
</div>

          </Card>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBase;