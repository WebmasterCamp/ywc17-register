import { message } from 'antd'
import * as firebase from 'firebase/app'
import { action, observable } from 'mobx'
import { create, persist } from 'mobx-persist'

import { fetch, fetchWithToken } from '../utils/fetch'
import { auth } from '../utils/firebase'
import history from '../utils/history'
import { getToken, removeToken, saveToken } from '../utils/token-helper'

interface IProfileResponse {
  status: string
  payload: any
}

class Auth {
  @persist @observable loading: boolean = true
  @persist @observable signingIn: boolean = false
  @persist @observable facebookDisplayName: string = ''
  @persist @observable facebookProfilePicture: string = ''
  @persist @observable userId: string = ''

  @action
  async doAuthentication() {
    this.loading = true
    this.signingIn = true
    await auth
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        const provider = new firebase.auth.FacebookAuthProvider()
        provider.addScope('email')
        return firebase.auth().signInWithRedirect(provider)
      })
      .catch(e => {
        message.error('Something went wrong!')
        this.loading = false
        throw e
      })
  }

  @action
  async doSignIn(firebaseUser: any) {
    const login = await fetch(
      'auth/login',
      {
        accessToken: firebaseUser.credential.accessToken,
        firebaseUid: firebaseUser.user.uid
      },
      'POST'
    )

    if (login.status === 'success') {
      saveToken(login.payload.token)

      this.getProfile()
    } else {
      this.loading = false
      message.error('เกิดข้อผิดพลาด')
      throw login.payload
    }
  }

  @action
  getFacebookDisplayName() {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        this.facebookDisplayName = user.displayName || ''
        this.facebookProfilePicture = user.photoURL || ''
        this.userId = user.uid
      } else {
        message.error('กรุณาเข้าสู่ระบบก่อนสมัคร')
        this.doLogout()
        unsubscribe()
      }
    })
  }

  @action
  async doLogout() {
    this.facebookDisplayName = ''
    this.facebookProfilePicture = ''
    this.userId = ''
    await firebase.auth().signOut()
    removeToken()
    history.push('/')
  }

  @action
  async getUserId() {
    if (getToken()) {
      const getProfile = await fetchWithToken('users/me', {}, 'GET')

      if (getProfile.status === 'success') {
        this.userId = getProfile.payload.firebase_uid
      }
    }
  }

  @action
  async checkAuthentication() {
    if (getToken()) {
      const getProfile = await fetchWithToken<IProfileResponse>(
        'users/me',
        {},
        'GET'
      )
      if (getProfile.status === 'success') {
        await this.getProfile(getProfile)
        return
      }
    }
    this.loading = false
  }

  @action
  async getProfile(profile?: IProfileResponse) {
    const getProfile =
      profile || (await fetchWithToken<IProfileResponse>('users/me', {}, 'GET'))

    if (getProfile.status === 'completed') {
      history.push('/completed')
      this.loading = false
      return
    }

    if (getProfile.status !== 'success') {
      message.error('Something went wrong!')

      this.loading = false

      return
    }

    this.userId = getProfile.payload._id

    message.success('เข้าสู่ระบบสำเร็จ')

    if (getProfile.payload.status === 'completed') {
      history.push(`/completed`)
      this.loading = false
      return
    } else {
      history.push(`/step/${getProfile.payload.step}`)
    }

    this.loading = false
  }
}

const hydrate = create()

const AuthStore = new Auth()

export default AuthStore
hydrate('auth', AuthStore)
