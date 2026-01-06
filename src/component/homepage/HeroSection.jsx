import React from "react";
import { MessageSquare, BookOpen, Users, Zap, ArrowRight, Play } from "lucide-react";
import heroImage from "../assets/hero-image.jpg";
import "./HeroSection.css";
import { useI18n } from "../../i18n/i18n.jsx";

const HeroSection = () => {
  // const iconSize = 20;
  const { t } = useI18n();

  return (
    <section className="hero-root">
      <div className="hero-gradient" />
      <div className="hero-overlay" />

      <div className="hero-container">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-badge"><Zap /> <span>{t('hero_badge')}</span></div>

            <h1 className="hero-title">{t('hero_title_prefix')} <span className="text-gradient">{t('hero_title_highlight')}</span> {t('hero_title_suffix')}</h1>

            <p className="hero-desc">{t('hero_desc')}</p>

            <div className="hero-ctas">
              <button className="btn btn-primary"><MessageSquare /> {t('hero_cta_ask')} <ArrowRight /></button>
              <button className="btn btn-outline"><Play /> {t('hero_cta_demo')}</button>
            </div>

            <div className="hero-stats">
              <div><div className="stat-num">24/7</div><div className="stat-label">{t('stat_available')}</div></div>
              <div><div className="stat-num">1000+</div><div className="stat-label">{t('stat_answered')}</div></div>
              <div><div className="stat-num">98%</div><div className="stat-label">{t('stat_accuracy')}</div></div>
            </div>
          </div>

          <div className="hero-right">
            <img src={heroImage} alt="Hero" className="hero-image" />
            <div className="floating-primary"><MessageSquare /> <span>{t('floating_ai_assistant')}</span></div>
            <div className="floating-card">
              <div className="avatars">
                <span className="a a1" />
                <span className="a a2" />
                <span className="a a3" />
              </div>
              <span>{t('active_users')}</span>
            </div>
          </div>
        </div>

        <div className="features">
          <div className="card feature">
            <div className="feature-icon"><MessageSquare /></div>
            <h3>{t('feature1_title')}</h3>
            <p>{t('feature1_desc')}</p>
          </div>
          <div className="card feature">
            <div className="feature-icon"><BookOpen /></div>
            <h3>{t('feature2_title')}</h3>
            <p>{t('feature2_desc')}</p>
          </div>
          <div className="card feature">
            <div className="feature-icon"><Users /></div>
            <h3>{t('feature3_title')}</h3>
            <p>{t('feature3_desc')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
