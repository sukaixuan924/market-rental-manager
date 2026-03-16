const API_BASE = 'http://122.51.230.169:3000'

// API请求封装
async function request(endpoint: string, options: any = {}) {
  const url = `${API_BASE}${endpoint}`
  const config: any = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }
  
  if (options.method) config.method = options.method
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }
  
  const response = await fetch(url, config)
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || '请求失败')
  }
  
  return data
}

// 用户API
export const userAPI = {
  login: (username: string, password: string) => 
    request('/api/login', { method: 'POST', body: { username, password } }),
  
  register: (username: string, password: string, nickname?: string) =>
    request('/api/register', { method: 'POST', body: { username, password, nickname } }),
  
  getAll: () => request('/api/users')
}

// 位置API
export const stallAPI = {
  getAll: () => request('/api/stalls'),
  
  create: (stall: any) => request('/api/stalls', { method: 'POST', body: stall }),
  
  delete: (id: string) => request(`/api/stalls/${id}`, { method: 'DELETE' })
}

// 记录API
export const recordAPI = {
  getAll: () => request('/api/records'),
  
  create: (record: any) => request('/api/records', { method: 'POST', body: record }),
  
  delete: (id: string) => request(`/api/records/${id}`, { method: 'DELETE' })
}