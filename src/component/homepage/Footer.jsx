import React from "react";
import "./Footer.css";
import { useI18n } from "../../i18n/i18n.jsx";

const Footer = () => {
  const { t } = useI18n();
  return (
    <footer className="footer-root" aria-labelledby="footer-title">
      <div className="fx-orbs" aria-hidden="true">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
      </div>
      <div className="footer-container">
        <div className="footer-top">
          <h3 id="footer-title" className="footer-title">{t('appName')}</h3>
          <p className="footer-sub">{t('footer_sub')}</p>
        </div>

        <div className="footer-links" role="navigation" aria-label="Footer">
          <a className="f-link" href="#knowledge">Knowledge</a>
          <a className="f-link" href="#qa">Q&A</a>
          <a className="f-link" href="#jobs">Jobs</a>
          <a className="f-link" href="#privacy">Privacy</a>
        </div>

        <div className="footer-divider" />

        <div className="footer-copy">© {new Date().getFullYear()} FPT University. {t('rights_reserved')}</div>
      </div>
    </footer>
  );
};

export default Footer;
