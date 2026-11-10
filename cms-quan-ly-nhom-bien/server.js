const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ANH_DIR = process.env.ANH_DIR ||
  (fs.existsSync(path.resolve(__dirname, '../anh')) ? path.resolve(__dirname, '../anh') :
   fs.existsSync(path.resolve(__dirname, 'anh')) ? path.resolve(__dirname, 'anh') :
   path.resolve('c:/Antigravity/luat-giao-thong-bien-bao/anh'));
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const DB_FILE = path.resolve(__dirname, 'data/db.json');

// In-memory Database with file synchronization
let db = { groups: [], items: [], questions: [] };

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
      console.log(`[DB] Loaded ${db.groups.length} groups, ${db.items.length} items, ${db.questions.length} questions.`);
    }
  } catch (err) {
    console.error('[DB] Error loading database:', err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Error saving database:', err);
  }
}

loadDb();

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // limit max body to 50MB for image base64 uploads
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

// Send JSON Helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Serve Static File Helper
function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
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

  // -------------------------------------------------------------
  // Static Route: Images in /anh/*
  // -------------------------------------------------------------
  if (pathname.startsWith('/anh/')) {
    const fileName = pathname.substring(5); // strip '/anh/'
    const filePath = path.join(ANH_DIR, fileName);
    return serveStatic(req, res, filePath);
  }

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    try {
      // GET /api/groups - List all groups
      if (method === 'GET' && pathname === '/api/groups') {
        const result = db.groups.map(g => {
          const count = db.items.filter(item => item.groupId === g.id).length;
          return { ...g, item_count: count };
        });
        return sendJson(res, 200, result);
      }

      // GET /api/groups/:id - Get single group with all sign items
      const groupMatch = pathname.match(/^\/api\/groups\/([a-zA-Z0-9_\-]+)$/);
      if (method === 'GET' && groupMatch) {
        const groupId = groupMatch[1];
        const group = db.groups.find(g => g.id === groupId);
        if (!group) return sendJson(res, 404, { error: 'Nhóm không tồn tại' });
        const items = db.items.filter(item => item.groupId === groupId);
        return sendJson(res, 200, { ...group, items });
      }

      // POST /api/groups - Create a new group + batch items
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

        db.groups.unshift(newGroup);

        // Add items if any
        if (Array.isArray(payload.items)) {
          payload.items.forEach((item, idx) => {
            db.items.push({
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
        console.log(`[API] Created group: "${newGroup.name}" with ${(payload.items || []).length} items.`);
        return sendJson(res, 201, { success: true, group: newGroup });
      }

      // PUT /api/groups/:id - Bulk update group and its items
      if (method === 'PUT' && groupMatch) {
        const groupId = groupMatch[1];
        const payload = await parseBody(req);
        const groupIndex = db.groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return sendJson(res, 404, { error: 'Nhóm không tồn tại' });

        // Update group info
        db.groups[groupIndex] = {
          ...db.groups[groupIndex],
          name: payload.name !== undefined ? payload.name.trim() : db.groups[groupIndex].name,
          code: payload.code !== undefined ? payload.code : db.groups[groupIndex].code,
          type: payload.type !== undefined ? payload.type : db.groups[groupIndex].type,
          description: payload.description !== undefined ? payload.description : db.groups[groupIndex].description,
          updated_at: new Date().toISOString().split('T')[0]
        };

        // If items are passed, replace/update group items
        if (Array.isArray(payload.items)) {
          // Remove old items of this group
          db.items = db.items.filter(item => item.groupId !== groupId);
          // Add updated items
          payload.items.forEach((item, idx) => {
            db.items.push({
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
          db.groups[groupIndex].item_count = payload.items.length;
        }

        saveDb();
        console.log(`[API] Bulk updated group "${db.groups[groupIndex].name}" (${(payload.items || []).length} items)`);
        return sendJson(res, 200, { success: true, group: db.groups[groupIndex] });
      }

      // DELETE /api/groups/:id - Delete group & all its items
      if (method === 'DELETE' && groupMatch) {
        const groupId = groupMatch[1];
        const group = db.groups.find(g => g.id === groupId);
        if (!group) return sendJson(res, 404, { error: 'Nhóm không tồn tại' });

        const deletedCount = db.items.filter(item => item.groupId === groupId).length;
        db.groups = db.groups.filter(g => g.id !== groupId);
        db.items = db.items.filter(item => item.groupId !== groupId);

        saveDb();
        console.log(`[API] Deleted group "${group.name}" along with ${deletedCount} child items.`);
        return sendJson(res, 200, {
          success: true,
          message: `Đã xoá nhóm "${group.name}" và toàn bộ ${deletedCount} chi tiết biển trong nhóm.`,
          deletedCount
        });
      }

      // GET /api/signs/all - Quick list of all signs for linking
      if (method === 'GET' && pathname === '/api/signs/all') {
        const signs = db.items.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          image: item.image
        }));
        return sendJson(res, 200, signs);
      }

      // GET /api/questions/search?q=... - Search 600 theory questions
      if (method === 'GET' && pathname === '/api/questions/search') {
        const q = (parsedUrl.query.q || '').toString().toLowerCase().trim();
        let matches = db.questions;
        if (q) {
          matches = db.questions.filter(item =>
            item.id.toString() === q || item.text.toLowerCase().includes(q)
          );
        }
        return sendJson(res, 200, matches.slice(0, 20));
      }

      // POST /api/upload - Handle image upload
      if (method === 'POST' && pathname === '/api/upload') {
        const payload = await parseBody(req);
        if (!payload.data || !payload.fileName) {
          return sendJson(res, 400, { error: 'Thiếu dữ liệu ảnh hoặc tên file' });
        }
        // Base64 decode
        const base64Data = payload.data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const cleanFileName = `upload_${Date.now()}_${payload.fileName.replace(/[^a-zA-Z0-9\._\-]/g, '_')}`;
        const targetPath = path.join(ANH_DIR, cleanFileName);
        fs.writeFileSync(targetPath, buffer);
        console.log(`[Upload] Saved image: ${cleanFileName}`);
        return sendJson(res, 200, {
          success: true,
          fileName: cleanFileName,
          url: `/anh/${cleanFileName}`
        });
      }

      // Unknown API route
      return sendJson(res, 404, { error: 'API route not found' });
    } catch (apiErr) {
      console.error('[API Error]:', apiErr);
      return sendJson(res, 500, { error: apiErr.message });
    }
  }

  // -------------------------------------------------------------
  // Static Routes: Public directory (SPA)
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  serveStatic(req, res, filePath);
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 VNEXPRESS CMS - QUẢN LÝ NHÓM BIỂN BÁO GIAO THÔNG`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📂 Static assets served from: ${PUBLIC_DIR}`);
  console.log(`🖼️ Sign images served from: ${ANH_DIR}`);
  console.log(`=======================================================`);
});
