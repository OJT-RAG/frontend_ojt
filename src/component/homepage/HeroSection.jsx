import React from "react";
import { MessageSquare, BookOpen, Users, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./HeroSection.css";
import { useI18n } from "../../i18n/i18n.jsx";

const HeroSection = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  // 1️⃣ IMAGE PATHS
  const heroBanner = "/Hero-banner-webFPTU-2026-2DaoTao100.jpg";
  const heroBanner2 = "/Bannerweb-Hocphi-Artboard-2-copy-5100-1024x474.png";
  const heroBanner3 ="/2023_12_9_638376784136834685_hoc-phi-he-dai-hoc-fpt-cover.webp"
  const fptLogo1 = "/fpt.png";
  const fptLogo2 = "/fpt2.png";
  
  // 2️⃣ SLIDER IMAGES (PHẢI Ở TRƯỚC)
  const sliderImages = [
    { src: heroBanner, alt: "FPTU banner", kind: "banner" },
    { src: heroBanner2, alt: "FPTU banner 2", kind: "banner" },
    { src: heroBanner3, alt: "FPTU banner 3", kind: "banner" },
    { src: fptLogo1, alt: "FPT", kind: "logo" },
    { src: fptLogo2, alt: "FPT", kind: "logo" },
  ];

  // 3️⃣ FILTER BANNERS


  const banners = sliderImages.filter(i => i.kind === "banner");
    const bannerSlides = [...banners, banners[0]];
  const [enableTransition, setEnableTransition] = React.useState(true);
  
  // 4️⃣ CAROUSEL STATE
  const [index, setIndex] = React.useState(0);

 React.useEffect(() => {
  if (!banners.length) return;

  const timer = setInterval(() => {
    setIndex(prev => prev + 1);
  }, 4000);

  return () => clearInterval(timer);
}, [banners.length]);

React.useEffect(() => {
  if (index === banners.length) {
    const timeout = setTimeout(() => {
      setEnableTransition(false);
      setIndex(0);
    }, 500); // phải khớp với CSS transition

    return () => clearTimeout(timeout);
  } else {
    setEnableTransition(true);
  }
}, [index, banners.length]);


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
  <div
    className="hero-carousel-track"
    style={{
      transform: `translateX(-${index * 100}%)`,
      transition: enableTransition ? "transform 0.5s ease-in-out" : "none",
    }}
  >
    {bannerSlides.map((img, idx) => (
      <div className="hero-carousel-slide" key={idx}>
        <img src={img.src} alt={img.alt} />
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