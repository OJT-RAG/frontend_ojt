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
        {/* Main row */}
        <div className="footer-main">
          {/* LEFT: Logo */}
          <div className="footer-left">
            <img
              src="/FPT_logo_2010.svg.png"
              alt="FPT University Logo"
              className="footer-logo"
            />
          </div>

          {/* CENTER: Links */}
          <div
            className="footer-links footer-links-center"
            role="navigation"
            aria-label="Footer"
          >
            <a className="f-link" href="#knowledge">Knowledge</a>
            <a className="f-link" href="#qa">Q&A</a>
            <a className="f-link" href="#jobs">Jobs</a>
            <a className="f-link" href="#privacy">Privacy</a>
          </div>

          {/* RIGHT: Contact */}
          <div className="footer-right">
            
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:qhdn.fuhcm@fe.edu.vn">
                qhdn.fuhcm@fe.edu.vn
              </a>
            </p>
            <p>
              <strong>Điện thoại:</strong>{" "}
              <a href="tel:0934177713">0934 177 713</a>
            </p>
            <p>
              <strong>Website:</strong>{" "}
              <a
                href="https://qhdn-hcmuni.fpt.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
                qhdn-hcmuni.fpt.edu.vn
              </a>
            </p>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-copy">
          © {new Date().getFullYear()} FPT University. {t("rights_reserved")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;