const url = require('url');
const fs = require('fs');
const path = require('path');

// Load database
let db = null;
function getDb() {
  if (!db) {
    try {
      db = require('../data/db.json');
    } catch (e) {
      console.error('[API] Error loading db.json:', e);
      db = { groups: [], items: [], questions: [] };
    }
  }
  return db;
}

function saveDb() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    if (fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('[API] Could not write to disk (Vercel serverless environment):', err.message);
  }
}

// MIME types for images fallback
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function parseBody(req) {
  if (req.body) {
    return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const method = req.method;
  const currentDb = getDb();

  // -------------------------------------------------------------
  // Image Fallback Handler: /anh/*
  // -------------------------------------------------------------
  if (pathname.startsWith('/anh/')) {
    const fileName = pathname.substring(5);
    const filePath = path.join(process.cwd(), 'public', 'anh', fileName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const stats = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stats.size,
        'Cache-Control': 'public, max-age=86400, immutable'
      });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Image Not Found');
    }
  }

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------
  try {
    // GET /api/groups
    if (method === 'GET' && pathname === '/api/groups') {
      const result = currentDb.groups.map(g => {
        const count = currentDb.items.filter(item => item.groupId === g.id).length;
        return { ...g, item_count: count };
      });
      return sendJson(res, 200, result);
    }

    // GET /api/groups/:id
    const groupMatch = pathname.match(/^\/api\/groups\/([a-zA-Z0-9_\-]+)$/);
    if (method === 'GET' && groupMatch) {
      const groupId = groupMatch[1];
      const group = currentDb.groups.find(g => g.id === groupId);
      if (!group) return sendJson(res, 404, { error: 'Nhóm không tồn tại' });
      const items = currentDb.items.filter(item => item.groupId === groupId);
      return sendJson(res, 200, { ...group, items });
    }

    // POST /api/groups
    if (method === 'POST' && pathname === '/api/groups') {
      const payload = await parseBody(req);
      if (!payload.name) return sendJson(res, 400, { error: 'Tên nhóm là bắt buộc' });

      const newId = payload.id || `nhom-${Date.now()}`;
      const newGroup = {
        id: newId,
        code: payload.code || `NHOM_${Date.now()}`,
        name: payload.name.trim(),
        type: payload.type || 'Biển báo giao thông',
        description: payload.description || '',
        author: payload.author || 'Trungvh9',
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0],
        status: 'Hiển thị',
        item_count: (payload.items || []).length
      };

      currentDb.groups.unshift(newGroup);

      if (Array.isArray(payload.items)) {
        payload.items.forEach((item, idx) => {
          currentDb.items.push({
            id: item.id || `item-${Date.now()}-${idx}`,
            groupId: newId,
            name: item.name || `Biển số ${idx + 1}`,
            code: item.code || '',
            image: item.image || '/anh/default.png',
            title: item.title || item.name || '',
            content: item.content || '',
            related_signs: item.related_signs || [],
            related_questions: item.related_questions || [],
            order: idx + 1,
            created_at: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString().split('T')[0]
          });
        });
      }

      saveDb();
      return sendJson(res, 201, { success: true, group: newGroup });
    }

    // PUT /api/groups/:id
    if (method === 'PUT' && groupMatch) {
      const groupId = groupMatch[1];
      const payload = await parseBody(req);
      const groupIndex = currentDb.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return sendJson(res, 404, { error: 'Nhóm không tồn tại' });

      currentDb.groups[groupIndex] = {
        ...currentDb.groups[groupIndex],
        name: payload.name !== undefined ? payload.name.trim() : currentDb.groups[groupIndex].name,
        code: payload.code !== undefined ? payload.code : currentDb.groups[groupIndex].code,
        type: payload.type !== undefined ? payload.type : currentDb.groups[groupIndex].type,
        description: payload.description !== undefined ? payload.description : currentDb.groups[groupIndex].description,
        updated_at: new Date().toISOString().split('T')[0]
      };

      if (Array.isArray(payload.items)) {
        currentDb.items = currentDb.items.filter(item => item.groupId !== groupId);
        payload.items.forEach((item, idx) => {
          currentDb.items.push({
            id: item.id || `item-${Date.now()}-${idx}`,
            groupId: groupId,
            name: item.name || `Biển ${idx + 1}`,
            code: item.code || '',
            image: item.image || '',
            title: item.title || item.name || '',
            content: item.content || '',
            related_signs: Array.isArray(item.related_signs) ? item.related_signs : [],
            related_questions: Array.isArray(item.related_questions) ? item.related_questions : [],
            order: idx + 1,
            created_at: item.created_at || new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString().split('T')[0]
          });
        });
      }

      saveDb();
      return sendJson(res, 200, { success: true, group: currentDb.groups[groupIndex] });
    }

    // DELETE /api/groups/:id
    if (method === 'DELETE' && groupMatch) {
      const groupId = groupMatch[1];
      const groupIndex = currentDb.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return sendJson(res, 404, { error: 'Nhóm không tồn tại' });

      const deletedGroup = currentDb.groups.splice(groupIndex, 1)[0];
      const initialItemCount = currentDb.items.length;
      currentDb.items = currentDb.items.filter(item => item.groupId !== groupId);
      const deletedItemsCount = initialItemCount - currentDb.items.length;

      saveDb();
      return sendJson(res, 200, {
        success: true,
        message: `Đã xoá thành công nhóm "${deletedGroup.name}" và ${deletedItemsCount} chi tiết biển con.`,
        deletedGroup,
        deletedItemsCount
      });
    }

    // GET /api/signs/all
    if (method === 'GET' && pathname === '/api/signs/all') {
      const compactList = currentDb.items.map(i => ({
        id: i.id,
        name: i.name,
        code: i.code,
        image: i.image,
        groupId: i.groupId
      }));
      return sendJson(res, 200, compactList);
    }

    // GET /api/questions/search
    if (method === 'GET' && pathname.startsWith('/api/questions/search')) {
      const query = (parsedUrl.query.q || '').toString().toLowerCase().trim();
      if (!query) {
        return sendJson(res, 200, currentDb.questions.slice(0, 20));
      }
      const matches = currentDb.questions.filter(q =>
        q.id.toString() === query ||
        q.text.toLowerCase().includes(query)
      ).slice(0, 20);
      return sendJson(res, 200, matches);
    }

    // POST /api/upload
    if (method === 'POST' && pathname === '/api/upload') {
      const payload = await parseBody(req);
      if (!payload.fileName || !payload.data) {
        return sendJson(res, 400, { error: 'Thiếu fileName hoặc dữ liệu ảnh' });
      }

      const uploadDir = path.join(process.cwd(), 'public', 'anh');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = payload.fileName.replace(/[/\\?%*:|"<>]/g, '_');
      const targetPath = path.join(uploadDir, safeName);

      try {
        const base64Data = payload.data.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
      } catch (e) {
        console.warn('[Upload] Disk write skipped in serverless mode');
      }

      return sendJson(res, 200, {
        success: true,
        url: `/anh/${encodeURIComponent(safeName)}`,
        fileName: safeName
      });
    }

    return sendJson(res, 404, { error: 'API route not found' });
  } catch (err) {
    console.error('[API Error]:', err);
    return sendJson(res, 500, { error: 'Lỗi máy chủ nội bộ: ' + err.message });
  }
};
