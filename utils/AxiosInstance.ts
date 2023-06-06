import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config()

const axiosInstance = axios.create({
  baseURL: process.env.BUGZILLA_BASE_URI,
  headers: { 'X-BUGZILLA-API-KEY': process.env.BUGZILLA_API_KEY, 'Content-Type': 'application/json' },
})

export default axiosInstance
