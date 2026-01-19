import React from "react";
import { MessageSquare, BookOpen, Users, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./HeroSection.css";
import { useI18n } from "../../i18n/i18n.jsx";

const HeroSection = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const heroBanner = "/Hero-banner-webFPTU-2026-2DaoTao100.jpg";
  const fptLogo1 = "/fpt.png";
  const fptLogo2 = "/fpt2.png";

  const sliderImages = [
    { src: heroBanner, alt: "FPTU banner", kind: "banner" },
    { src: fptLogo1, alt: "FPT", kind: "logo" },
    { src: fptLogo2, alt: "FPT", kind: "logo" },
  ];

  return (
    <section className="hero-root">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-bg-image" style={{ backgroundImage: `url(${heroBanner})` }} />
        <div className="hero-bg-wash" />
        <div className="hero-bg-grid" />
        <div className="hero-bg-orbs">
          <span className="orb o1" />
          <span className="orb o2" />
          <span className="orb o3" />
        </div>
      </div>

      <div className="hero-container">
        <div className="hero-grid">
          {/* LEFT */}
          <div className="hero-left">
            <div className="hero-badge">
              <Zap />
              <span>{t("hero_badge")}</span>
            </div>

            <h1 className="hero-title">
              {t("hero_title_prefix")}{" "}
              <span className="text-gradient">
                {t("hero_title_highlight")}
              </span>{" "}
              {t("hero_title_suffix")}
            </h1>

            <p className="hero-desc">{t("hero_desc")}</p>

            {/* CTA */}
            <div className="hero-ctas">
              <button
                className="hero-cta hero-cta-primary"
                onClick={() => navigate("/qa")}
              >
                <MessageSquare />
                {t("hero_cta_ask")}
                <ArrowRight />
              </button>

              <button
                className="hero-cta hero-cta-secondary"
                onClick={() => navigate("/ojt")}
              >
                <BookOpen />
                OJT Docs
              </button>
            </div>

            {/* STATS */}
            <div className="hero-stats">
              <div>
                <div className="stat-num">24/7</div>
                <div className="stat-label">
                  {t("stat_available")}
                </div>
              </div>
              <div>
                <div className="stat-num">1000+</div>
                <div className="stat-label">
                  {t("stat_answered")}
                </div>
              </div>
              <div>
                <div className="stat-num">98%</div>
                <div className="stat-label">
                  {t("stat_accuracy")}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="hero-right">
            <div className="hero-media" role="img" aria-label="FPT University" >
              <div className="hero-media-glow" aria-hidden="true" />

              <div className="hero-slider" aria-hidden="true">
                <div className="hero-slider-track">
                  {[...sliderImages, ...sliderImages].map((img, idx) => (
                    <div
                      key={`${img.src}-${idx}`}
                      className={`hero-slide ${img.kind === "logo" ? "logo" : "banner"}`}
					  style={
						img.kind === "banner"
							? { "--banner-bg": `url(${img.src})` }
							: undefined
					  }
                    >
                      <img src={img.src} alt={img.alt} loading="eager" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="floating-primary">
                <MessageSquare />
                <span>{t("floating_ai_assistant")}</span>
              </div>

              <div className="floating-card">
                <div className="avatars" aria-hidden="true">
                  <span className="a a1" />
                  <span className="a a2" />
                  <span className="a a3" />
                </div>
                <span>{t("active_users")}</span>
              </div>

            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="features">
          <div className="card feature">
            <div className="feature-icon">
              <MessageSquare />
            </div>
            <h3>{t("feature1_title")}</h3>
            <p>{t("feature1_desc")}</p>
          </div>

          <div className="card feature">
            <div className="feature-icon">
              <BookOpen />
            </div>
            <h3>{t("feature2_title")}</h3>
            <p>{t("feature2_desc")}</p>
          </div>

          <div className="card feature">
            <div className="feature-icon">
              <Users />
            </div>
            <h3>{t("feature3_title")}</h3>
            <p>{t("feature3_desc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;