const http = require('http');
const { Client } = require('pg');

const PORT = 3000;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'market123',
  database: 'market_rental'
});

client.connect();

// 简单哈希
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h;
  }
  return h.toString(16);
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

  res.setHeader('Content-Type', 'application/json');

  try {
    // 用户相关API
    if (url === '/api/users' && method === 'GET') {
      const result = await client.query('SELECT id, username, nickname, role, status, created_at, last_login_at FROM users');
      res.writeHead(200);
      res.end(JSON.stringify(result.rows));
      return;
    }

    if (url === '/api/register' && method === 'POST') {
      const body = await parseBody(req);
      
      const existing = await client.query('SELECT id FROM users WHERE username = $1', [body.username]);
      if (existing.rows.length > 0) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '账号已存在' }));
        return;
      }
      
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      const role = 'user';
      
      await client.query(
        'INSERT INTO users (id, username, password_hash, nickname, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, body.username, hash(body.password), body.nickname || body.username, role, 'active']
      );
      
      const token = Date.now().toString(36);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, user: { id, username: body.username, nickname: body.nickname || body.username, role }, token }));
      return;
    }

    if (url === '/api/login' && method === 'POST') {
      const body = await parseBody(req);
      
      const result = await client.query('SELECT * FROM users WHERE username = $1', [body.username]);
      const user = result.rows[0];
      
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
      
      if (user.password_hash !== hash(body.password)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '密码错误' }));
        return;
      }
      
      await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      
      const token = Date.now().toString(36);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, user: { ...user, password_hash: '***' }, token }));
      return;
    }

    // 位置相关API
    if (url === '/api/stalls' && method === 'GET') {
      const result = await client.query('SELECT * FROM stalls ORDER BY created_at');
      res.writeHead(200);
      res.end(JSON.stringify(result.rows));
      return;
    }

    if (url === '/api/stalls' && method === 'POST') {
      const body = await parseBody(req);
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      
      await client.query(
        'INSERT INTO stalls (id, name, area, default_price, long_term_price, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, body.name, body.area || '', body.defaultPrice || 50, body.longTermPrice || 800, body.status || 'active']
      );
      
      res.writeHead(200);
      res.end(JSON.stringify({ id, ...body }));
      return;
    }

    if (url.startsWith('/api/stalls/') && method === 'DELETE') {
      const id = url.split('/')[3];
      await client.query('DELETE FROM stalls WHERE id = $1', [id]);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 记录相关API
    if (url === '/api/records' && method === 'GET') {
      const result = await client.query('SELECT * FROM rental_records ORDER BY created_at DESC');
      res.writeHead(200);
      res.end(JSON.stringify(result.rows));
      return;
    }

    if (url === '/api/records' && method === 'POST') {
      const body = await parseBody(req);
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      
      await client.query(
        `INSERT INTO rental_records (id, stall_id, renter_name, rental_type, rental_type_name, date, start_date, end_date, rent_amount, payment_status, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, body.stallId, body.renterName, body.rentalType, body.rentalTypeName, body.date || null, body.startDate || null, body.endDate || null, body.rentAmount, body.paymentStatus, body.notes || '']
      );
      
      res.writeHead(200);
      res.end(JSON.stringify({ id, ...body }));
      return;
    }

    if (url.startsWith('/api/records/') && method === 'DELETE') {
      const id = url.split('/')[3];
      await client.query('DELETE FROM rental_records WHERE id = $1', [id]);
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
    res.end(JSON.stringify({ error: 'Server error: ' + e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`API服务器运行在 http://0.0.0.0:${PORT}`);
});