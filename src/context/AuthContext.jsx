import { createContext, useContext, useState } from 'react'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  function saveSession({ token, user }) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const login = async (email, password) =>
    saveSession(await authApi.login(email, password))

  const register = async (data) =>
    saveSession(await authApi.register(data))

  const loginWithGoogle = async (accessToken, role) =>
    saveSession(await authApi.googleLogin(accessToken, role))

  // обновить имя и телефон в шапке после сохранения профиля
  function updateUser(changes) {
    setUser((prev) => {
      const next = { ...prev, ...changes }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}