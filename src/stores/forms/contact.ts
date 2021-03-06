import { message } from 'antd'
import { action, observable } from 'mobx'
import { fetchWithToken } from '../../utils/fetch'
import history from '../../utils/history'
import stepChecker from '../../utils/stepChecker'

class Contact {
  @observable loading: boolean = false
  @observable formData: object = {}

  @action
  async getAnswers() {
    try {
      this.loading = true
      const result = await fetchWithToken('registration/contact', {}, 'GET')
      if (result.status === 'success') {
        if (stepChecker(result.payload.step, 'contact')) {
          return history.push(`/step/${result.payload.step}`)
        }
        this.formData = result.payload
      } else if (result.status === 'completed') {
        history.push('/completed')
      }
    } catch (error) {
      message.error('มีข้อผิิดพลาดเกิิดขึ้น กรุณาลองอีกครั้ง')
    } finally {
      this.loading = false
    }
  }
  async handleSubmit(data: object) {
    try {
      this.loading = true
      const result = await fetchWithToken('registration/contact', data, 'PUT')
      if (result.status === 'success') {
        history.push('/step/general')
      }
    } catch (error) {
      message.error('มีข้อผิิดพลาดเกิิดขึ้น กรุณาลองอีกครั้ง')
    } finally {
      this.loading = false
    }
  }
}

export default new Contact()
