import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, { payload: { user, token } }) => {
      state.user = user; state.token = token; state.isAuthenticated = true
      if (typeof window !== 'undefined') {
        localStorage.setItem('fm_token', token)
        localStorage.setItem('fm_user', JSON.stringify(user))
      }
    },
    logout: (state) => {
      state.user = null; state.token = null; state.isAuthenticated = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fm_token')
        localStorage.removeItem('fm_user')
      }
    },
    updateUser: (state, { payload }) => {
      state.user = { ...state.user, ...payload }
      if (typeof window !== 'undefined') localStorage.setItem('fm_user', JSON.stringify(state.user))
    },
    hydrateAuth: (state) => {
      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('fm_token')
          const user = localStorage.getItem('fm_user')
          if (token && user) {
            state.token = token
            state.user = JSON.parse(user)
            state.isAuthenticated = true
          }
        } catch {}
      }
      state.isHydrated = true
    },
  },
})

export const { setCredentials, logout, updateUser, hydrateAuth } = authSlice.actions
export default authSlice.reducer
export const selectUser = (s) => s.auth.user
export const selectToken = (s) => s.auth.token
export const selectIsAuth = (s) => s.auth.isAuthenticated
export const selectRole = (s) => s.auth.user?.role
export const selectOrg = (s) => s.auth.user?.organization
export const selectSub = (s) => s.auth.user?.organization?.subscription
export const selectIsHydrated = (s) => s.auth.isHydrated