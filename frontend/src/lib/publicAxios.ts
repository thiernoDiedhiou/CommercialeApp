import axios from 'axios'

// Client HTTP sans auth — utilisé par la landing page uniquement
const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

export default publicAxios
