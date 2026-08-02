import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(isFirebaseConfigured)
  const confirmationResultRef = useRef(null)
  const recaptchaVerifierRef = useRef(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      setUser(firebaseUser)
      setInitializing(false)
    })
    return unsubscribe
  }, [])

  const getRecaptchaVerifier = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
    }
    return recaptchaVerifierRef.current
  }

  const sendOtp = async phoneNumber => {
    const verifier = getRecaptchaVerifier()
    confirmationResultRef.current = await signInWithPhoneNumber(auth, phoneNumber, verifier)
  }

  const confirmOtp = async code => {
    if (!confirmationResultRef.current) throw new Error('No OTP request in progress')
    const result = await confirmationResultRef.current.confirm(code)
    return result.user
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider
      value={{ user, initializing, sendOtp, confirmOtp, logout, isFirebaseConfigured }}
    >
      {children}
      {isFirebaseConfigured && <div id="recaptcha-container" />}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
