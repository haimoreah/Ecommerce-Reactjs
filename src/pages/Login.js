import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import restaurant from '../config/restaurant'

const JORDAN_MOBILE_REGEX = /^7[789]\d{7}$/

export default function Login() {
  const { lang, t } = useLang()
  const { sendOtp, confirmOtp, isFirebaseConfigured } = useAuth()
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const localDigits = phone.replace(/\D/g, '').replace(/^0+/, '')
  const e164Phone = `+962${localDigits}`

  const handleSendOtp = async () => {
    setError('')
    if (!JORDAN_MOBILE_REGEX.test(localDigits)) {
      setError(t('invalidPhone'))
      return
    }
    setBusy(true)
    try {
      await sendOtp(e164Phone)
      setStep('otp')
    } catch (e) {
      setError(t('sendFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setBusy(true)
    try {
      await confirmOtp(code)
    } catch (e) {
      setError(t('invalidOtp'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hg-login">
      <div className="hg-login-logo">
        <span className="hg-o" />
        {restaurant.name}
      </div>
      <div className="hg-tagline" style={{ textAlign: 'center', marginBottom: 24 }}>
        {restaurant.tagline[lang]}
      </div>

      <div className="hg-login-card">
        {!isFirebaseConfigured ? (
          <>
            <div className="hg-login-title">Firebase setup needed</div>
            <p className="hg-login-subtitle">
              Phone login isn't connected yet. Create a Firebase project, enable Phone
              authentication, and add your web app's config values to a <code>.env</code> file
              (see <code>.env.example</code>) to turn this on.
            </p>
          </>
        ) : step === 'phone' ? (
          <>
            <div className="hg-login-title">{t('getStarted')}</div>
            <p className="hg-login-subtitle">{t('enterPhonePrompt')}</p>
            <div className="hg-phone-input">
              <span className="hg-phone-prefix">
                <span role="img" aria-label="Jordan flag">
                  🇯🇴
                </span>{' '}
                +962
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="7X XXX XXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            {error && <div className="hg-login-error">{error}</div>}
            <button className="hg-btn-primary" disabled={busy} onClick={handleSendOtp}>
              {busy ? t('sending') : t('continueBtn')}
            </button>
          </>
        ) : (
          <>
            <div className="hg-login-title">{t('enterOtp')}</div>
            <p className="hg-login-subtitle">
              {t('otpSentTo')} {e164Phone}
            </p>
            <div className="hg-phone-input">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
            {error && <div className="hg-login-error">{error}</div>}
            <button className="hg-btn-primary" disabled={busy || code.length < 4} onClick={handleVerify}>
              {busy ? t('verifying') : t('verify')}
            </button>
            <div className="hg-login-links">
              <button className="hg-link-btn" onClick={handleSendOtp} disabled={busy}>
                {t('resendCode')}
              </button>
              <button className="hg-link-btn" onClick={() => setStep('phone')}>
                {t('changeNumber')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
