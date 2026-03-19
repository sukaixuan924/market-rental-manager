const http = require('http');
const fs = require('fs');
const path = require('path');
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

    if (url.startsWith('/api/records/') && method === 'PUT') {
      const id = url.split('/')[3];
      const body = await parseBody(req);
      
      // 构建动态更新语句
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      if (body.stallId !== undefined) {
        fields.push(`stall_id = $${paramIndex++}`);
        values.push(body.stallId);
      }
      if (body.renterName !== undefined) {
        fields.push(`renter_name = $${paramIndex++}`);
        values.push(body.renterName);
      }
      if (body.rentalType !== undefined) {
        fields.push(`rental_type = $${paramIndex++}`);
        values.push(body.rentalType);
      }
      if (body.rentalTypeName !== undefined) {
        fields.push(`rental_type_name = $${paramIndex++}`);
        values.push(body.rentalTypeName);
      }
      if (body.date !== undefined) {
        fields.push(`date = $${paramIndex++}`);
        values.push(body.date);
      }
      if (body.startDate !== undefined) {
        fields.push(`start_date = $${paramIndex++}`);
        values.push(body.startDate);
      }
      if (body.endDate !== undefined) {
        fields.push(`end_date = $${paramIndex++}`);
        values.push(body.endDate);
      }
      if (body.rentAmount !== undefined) {
        fields.push(`rent_amount = $${paramIndex++}`);
        values.push(body.rentAmount);
      }
      if (body.paymentStatus !== undefined) {
        fields.push(`payment_status = $${paramIndex++}`);
        values.push(body.paymentStatus);
      }
      if (body.notes !== undefined) {
        fields.push(`notes = $${paramIndex++}`);
        values.push(body.notes);
      }
      
      fields.push(`updated_at = NOW()`);
      
      if (fields.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE rental_records SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (url.startsWith('/api/records/') && method === 'DELETE') {
      const id = url.split('/')[3];
      await client.query('DELETE FROM rental_records WHERE id = $1', [id]);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 分享相关API
    // 创建分享链接
    if (url === '/api/share' && method === 'POST') {
      const body = await parseBody(req);
      
      const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      const expiresAt = body.days > 0 
        ? new Date(Date.now() + body.days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      await client.query(
        `INSERT INTO share_links (id, stall_ids, start_date, end_date, creator_name, expires_at, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [shareId, JSON.stringify(body.stallIds), body.startDate, body.endDate, body.creatorName, expiresAt]
      );
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, shareId }));
      return;
    }

    // 获取分享数据
    if (url.startsWith('/api/share/') && method === 'GET') {
      const shareId = url.split('/')[3];
      
      // 获取分享信息
      const shareResult = await client.query('SELECT * FROM share_links WHERE id = $1', [shareId]);
      if (shareResult.rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: '分享不存在' }));
        return;
      }
      
      const share = shareResult.rows[0];
      
      // 检查是否过期
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        res.writeHead(410);
        res.end(JSON.stringify({ success: false, error: '分享已过期' }));
        return;
      }
      
      const stallIds = JSON.parse(share.stall_ids || '[]');
      
      // 获取位置信息
      let stalls = [];
      if (stallIds.length > 0) {
        const stallsResult = await client.query(
          `SELECT * FROM stalls WHERE id = ANY($1)`,
          [stallIds]
        );
        stalls = stallsResult.rows;
      }
      
      // 获取出租记录（按日期范围筛选）
      let records = [];
      const query = share.start_date && share.end_date
        ? `SELECT r.*, s.name as stall_name FROM rental_records r 
           JOIN stalls s ON r.stall_id = s.id 
           WHERE r.stall_id = ANY($1) AND r.date >= $2 AND r.date <= $3 
           ORDER BY r.date DESC`
        : `SELECT r.*, s.name as stall_name FROM rental_records r 
           JOIN stalls s ON r.stall_id = s.id 
           WHERE r.stall_id = ANY($1) 
           ORDER BY r.date DESC`;
      
      const params = share.start_date && share.end_date
        ? [stallIds, share.start_date, share.end_date]
        : [stallIds];
      
      const recordsResult = await client.query(query, params);
      records = recordsResult.rows;
      
      res.writeHead(200);
      res.end(JSON.stringify({ 
        success: true, 
        share: share,
        stalls: stalls,
        records: records
      }));
      return;
    }

    // 腾讯云OCR API
    if (url === '/api/ocr' && method === 'POST') {
      const tencentcloud = require('tencentcloud-sdk-nodejs-ocr');
      const OcrClient = tencentcloud.ocr.v20181119.Client;
      const ocrConfig = {
        credential: {
          secretId: process.env.TENCENT_SECRET_ID || 'YOUR_SECRET_ID',
          secretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_SECRET_KEY'
        },
        region: 'ap-guangzhou'
      };
      
      const body = await parseBody(req);
      
      try {
        const client = new OcrClient(ocrConfig);
        
        let imageBase64 = body.image;
        if (imageBase64.startsWith('data:')) {
          imageBase64 = imageBase64.split(',')[1];
        }
        
        const result = await client.GeneralBasicOCR({
          ImageBase64: imageBase64
        });
        
        const texts = result.TextDetections ? result.TextDetections.map((t) => t.DetectedText) : [];
        
        // 过滤空文本
        const validTexts = texts.filter(t => t && t.trim().length > 0);
        
        console.log('识别文字:', JSON.stringify(validTexts));
        
        let name = '';
        let amount = '';
        let date = '';
        
        // 先找金额 - 微信收款显示为 "￥80.00" 或 "80元"
        for (const text of validTexts) {
          const amountMatch = text.match(/[￥￥]\s*(\d+\.?\d*)|(\d+\.?\d*)\s*元/);
          if (!amount && amountMatch) {
            amount = amountMatch[1] || amountMatch[2];
          }
          // 匹配日期
          if (!date && /(\d{1,2})[月/-](\d{1,2})[日]?/.test(text)) {
            const match = text.match(/(\d{1,2})[月/-](\d{1,2})[日]?/);
            if (match) {
              date = `2026-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}`;
            }
          }
        }
        
        // 找名字 - 微信名通常是"收款方"下面的大段文字，或者是长文本中包含"品牌"、"内衣"等关键词
        for (const text of validTexts) {
          // 匹配微信名（通常包含"品牌"、"店"等关键词，且长度较长）
          if (text.length >= 4 && (text.includes('品牌') || text.includes('店') || text.includes('工作室') || text.includes('商行'))) {
            name = text;
            break;
          }
        }
        
        // 如果没找到，尝试找第二行或包含数字较少的文本作为名字
        if (!name && validTexts.length > 1) {
          for (let i = 1; i < validTexts.length; i++) {
            const t = validTexts[i].trim();
            // 跳过太短的、纯数字的、包含特殊符号的
            if (t.length >= 3 && !/^\d+$/.test(t) && !t.includes('￥') && !t.includes('转账')) {
              name = t;
              break;
            }
          }
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          texts: texts,
          parsed: { name, amount, date }
        }));
      } catch (ocrError) {
        console.error('OCR错误:', ocrError);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: ocrError.message }));
      }
      return;
    }

    // 非API请求，返回前端静态文件（SPA支持）
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(content);
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