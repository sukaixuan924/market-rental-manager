const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    users: [],
    stalls: [],
    records: []
  }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 简单哈希
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h;
  }
  return h.toString(16);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  const method = req.method;

  // 设置响应头
  res.setHeader('Content-Type', 'application/json');

  try {
    // 用户相关API
    if (url === '/api/users' && method === 'GET') {
      const data = readData();
      // 隐藏密码
      data.users = data.users.map(u => ({ ...u, passwordHash: '***' }));
      res.writeHead(200);
      res.end(JSON.stringify(data.users));
      return;
    }

    if (url === '/api/register' && method === 'POST') {
      const body = await parseBody(req);
      const data = readData();
      
      if (data.users.find(u => u.username === body.username)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '账号已存在' }));
        return;
      }
      
      const newUser = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        username: body.username,
        passwordHash: hash(body.password),
        nickname: body.nickname || body.username,
        role: data.users.length === 0 ? 'admin' : 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: ''
      };
      
      data.users.push(newUser);
      writeData(data);
      
      // 自动登录
      const token = Date.now().toString(36);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, user: { ...newUser, passwordHash: '***' }, token }));
      return;
    }

    if (url === '/api/login' && method === 'POST') {
      const body = await parseBody(req);
      const data = readData();
      
      const user = data.users.find(u => u.username === body.username);
      if (!user) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '账号不存在' }));
        return;
      }
      
      if (user.status === 'disabled') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '账号已被禁用' }));
        return;
      }
      
      if (user.passwordHash !== hash(body.password)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '密码错误' }));
        return;
      }
      
      // 更新最后登录时间
      user.lastLoginAt = new Date().toISOString();
      writeData(data);
      
      const token = Date.now().toString(36);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, user: { ...user, passwordHash: '***' }, token }));
      return;
    }

    // 位置相关API
    if (url === '/api/stalls' && method === 'GET') {
      const data = readData();
      res.writeHead(200);
      res.end(JSON.stringify(data.stalls));
      return;
    }

    if (url === '/api/stalls' && method === 'POST') {
      const body = await parseBody(req);
      const data = readData();
      
      const newStall = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        ...body,
        createdAt: new Date().toISOString()
      };
      
      data.stalls.push(newStall);
      writeData(data);
      
      res.writeHead(200);
      res.end(JSON.stringify(newStall));
      return;
    }

    if (url.startsWith('/api/stalls/') && method === 'PUT') {
      const id = url.split('/')[3];
      const body = await parseBody(req);
      const data = readData();
      
      const index = data.stalls.findIndex(s => s.id === id);
      if (index === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: '位置不存在' }));
        return;
      }
      
      data.stalls[index] = { ...data.stalls[index], ...body };
      writeData(data);
      
      res.writeHead(200);
      res.end(JSON.stringify(data.stalls[index]));
      return;
    }

    if (url.startsWith('/api/stalls/') && method === 'DELETE') {
      const id = url.split('/')[3];
      const data = readData();
      
      data.stalls = data.stalls.filter(s => s.id !== id);
      writeData(data);
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 记录相关API
    if (url === '/api/records' && method === 'GET') {
      const data = readData();
      res.writeHead(200);
      res.end(JSON.stringify(data.records));
      return;
    }

    if (url === '/api/records' && method === 'POST') {
      const body = await parseBody(req);
      const data = readData();
      
      const newRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      data.records.push(newRecord);
      writeData(data);
      
      res.writeHead(200);
      res.end(JSON.stringify(newRecord));
      return;
    }

    if (url.startsWith('/api/records/') && method === 'PUT') {
      const id = url.split('/')[3];
      const body = await parseBody(req);
      const data = readData();
      
      const index = data.records.findIndex(r => r.id === id);
      if (index === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: '记录不存在' }));
        return;
      }
      
      data.records[index] = { ...data.records[index], ...body, updatedAt: new Date().toISOString() };
      writeData(data);
      
      res.writeHead(200);
      res.end(JSON.stringify(data.records[index]));
      return;
    }

    if (url.startsWith('/api/records/') && method === 'DELETE') {
      const id = url.split('/')[3];
      const data = readData();
      
      data.records = data.records.filter(r => r.id !== id);
      writeData(data);
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 同步API - 获取所有数据
    if (url === '/api/sync' && method === 'GET') {
      const data = readData();
      // 隐藏密码
      data.users = data.users.map(u => ({ ...u, passwordHash: '***' }));
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }

    // 同步API - 提交所有数据（会覆盖服务器数据，谨慎使用）
    if (url === '/api/sync' && method === 'POST') {
      const body = await parseBody(req);
      if (body.users) body.users.forEach(u => { if (u.passwordHash) u.passwordHash = hash(u.passwordHash) || u.passwordHash; });
      writeData(body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`API服务器运行在 http://0.0.0.0:${PORT}`);
});