import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/i18n.jsx';
import './ForgotPassword.scss';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      // eslint-disable-next-line no-console
      console.log('Password reset requested for', email);
      alert('If that email exists we sent a reset link.');
      // navigate back to login
      navigate('/login', { replace: true });
    }, 700);
  }

  const handleReturn = () => {
    navigate('/login'); // use { replace: true } if you don't want users to go back
  };

  const handleLogoHome = (e) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="forgot-container">
      <div
        className="fpt-uni-logo"
        role="button"
        tabIndex={0}
        onClick={handleLogoHome}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLogoHome(e)}
      >
        FPT UNIVERSITY
      </div>
      <button type="button" className="return-top" onClick={handleReturn}>
        {t('return')}
      </button>
      <form className="forgot-form" onSubmit={handleSubmit}>
        <div className="forgot-logo">FPT</div>
        <h2>{t('forgot_title')}</h2>
        <p>{t('forgot_desc')}</p>

        <input
          type="email"
          placeholder={t('email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Email"
        />

        <div className="actions">
          <button type="button" className="back-link" onClick={() => navigate('/login')}>
            {t('back_to_login')}
          </button>
          <button type="submit" disabled={submitting || !email}>
            {submitting ? t('sending') : t('send_reset_link')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;
