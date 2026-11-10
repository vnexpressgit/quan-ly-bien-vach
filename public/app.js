// Frontend Application Logic for VnExpress CMS - Quản lý Nhóm Biển Báo & Chi tiết Biển/Vạch
const App = {
  state: {
    groups: [],
    currentGroup: null,
    currentItems: [],
    allSigns: [],
    view: 'list', // 'list' | 'edit' | 'create' | 'items' | 'item-edit'
    modifiedCount: 0,
    deleteTargetGroupId: null,
    deleteTargetItemId: null,
    activeDropdown: null, // { itemId, type: 'sign' | 'question' }
    itemsData: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 },
    currentSingleItem: null,
    debounceTimer: null
  },

  // Initialize
  async init() {
    this.setupGlobalListeners();
    await this.loadAllSigns();
    await this.loadGroups();
    await this.loadItems(1);
  },

  setupGlobalListeners() {
    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.autocomplete-container') && !e.target.closest('.btn-add-tag')) {
        this.closeAutocomplete();
      }
    });

    // Setup drag and drop on create-dropzone
    const dropzone = document.getElementById('create-dropzone');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.style.background = '#e2f0fc';
          dropzone.style.borderColor = '#004080';
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropzone.style.background = '#f4f8fc';
          dropzone.style.borderColor = '#0066cc';
        });
      });
      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          this.handleMultiFileUpload(files);
        }
      });
    }
  },

  // API Call Helpers
  async fetchJson(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Yêu cầu không thành công');
      }
      return await res.json();
    } catch (err) {
      console.error('[API Fetch Error]:', err);
      this.showToast(err.message, 'error');
      throw err;
    }
  },

  // Load All Groups
  async loadGroups() {
    try {
      this.state.groups = await this.fetchJson('/api/groups');
      this.renderGroupList();
      this.populateGroupDropdowns();
    } catch (err) {
      document.getElementById('group-stats-text').innerText = 'Không thể tải danh sách nhóm';
    }
  },

  populateGroupDropdowns() {
    const filterSelect = document.getElementById('filter-individual-group');
    const editSelect = document.getElementById('single-item-group-select');

    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = `<option value="">-- Tất cả nhóm biển/vạch (${this.state.groups.length} nhóm) --</option>` +
        this.state.groups.map(g => `<option value="${g.id}">${this.escapeHtml(g.name)} (${g.item_count || 0})</option>`).join('');
      if (currentVal) filterSelect.value = currentVal;
    }

    if (editSelect) {
      editSelect.innerHTML = `<option value="">-- Chọn nhóm trực thuộc --</option>` +
        this.state.groups.map(g => `<option value="${g.id}">${this.escapeHtml(g.name)}</option>`).join('');
    }

    const badgeGroups = document.getElementById('badge-groups-count');
    if (badgeGroups) badgeGroups.innerText = `${this.state.groups.length} nhóm`;
  },

  // Load All Signs for quick linking
  async loadAllSigns() {
    try {
      this.state.allSigns = await this.fetchJson('/api/signs/all');
    } catch (e) {
      console.warn('Could not load all signs list:', e);
    }
  },

  // Render Group List (View 1)
  renderGroupList(filteredGroups = null) {
    const list = filteredGroups || this.state.groups;
    const tbody = document.getElementById('tbody-groups');
    tbody.innerHTML = '';

    const totalCount = this.state.groups.length;
    const totalItems = this.state.groups.reduce((sum, g) => sum + (g.item_count || 0), 0);
    document.getElementById('group-stats-text').innerHTML = `
      Total: <span style="color:#bd081c; font-size:15px;">${totalCount} nhóm</span> (${totalItems} chi tiết biển báo, báo hiệu & vạch kẻ đường)
    `;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#888;">Không tìm thấy nhóm biển báo nào phù hợp</td></tr>`;
      return;
    }

    list.forEach((g, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
        <td>
          <a href="javascript:void(0)" onclick="App.openBulkEditor('${g.id}')" style="color:#004080; font-weight:bold; text-decoration:none; font-size:13px;">
            ${this.getGroupIcon(g.type)} ${this.escapeHtml(g.name)}
          </a>
        </td>
        <td><code>${this.escapeHtml(g.code || '')}</code></td>
        <td style="text-align:center;">
          <span class="badge-count">${g.item_count || 0} item</span>
        </td>
        <td style="color:#444;">${this.escapeHtml(g.description || '')}</td>
        <td>${this.escapeHtml(g.author || 'Admin')}</td>
        <td style="text-align:center; color:#666;">${g.created_at || '2025-06-05'}</td>
        <td style="text-align:center; color:#bd081c; font-weight:bold;">${g.updated_at || '2026-11-10'}</td>
        <td style="text-align:center;"><span class="badge-status">${g.status || 'Hiển thị'}</span></td>
        <td style="text-align:center;">
          <span class="icon-edit" title="Sửa nhóm và biên tập hàng loạt chi tiết biển" onclick="App.openBulkEditor('${g.id}')">✏️</span>
          <span class="icon-delete" title="Xoá nhóm" onclick="App.promptDeleteGroup('${g.id}', '${this.escapeHtml(g.name)}', ${g.item_count || 0})">❌</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  getGroupIcon(type) {
    if (type === 'Vạch kẻ đường') return '🛣️';
    if (type === 'Biển cao tốc') return '🟢';
    if (type === 'Thiết bị báo hiệu') return '📍';
    if (type === 'Biểu tượng') return '🚗';
    return '🛑';
  },

  filterGroups() {
    const q = (document.getElementById('search-group-input').value || '').toLowerCase().trim();
    const type = document.getElementById('filter-group-type').value;

    const filtered = this.state.groups.filter(g => {
      const matchQ = !q || g.name.toLowerCase().includes(q) || (g.code && g.code.toLowerCase().includes(q));
      const matchType = !type || g.type === type;
      return matchQ && matchType;
    });

    this.renderGroupList(filtered);
  },

  // -------------------------------------------------------------
  // Bulk Editor Mode (View 2)
  // -------------------------------------------------------------
  async openBulkEditor(groupId) {
    try {
      const groupData = await this.fetchJson(`/api/groups/${groupId}`);
      this.state.currentGroup = groupData;
      this.state.currentItems = groupData.items || [];
      this.state.modifiedCount = 0;

      // Populate top fields
      document.getElementById('editor-group-title-header').innerText = `Biên tập Nhóm: ${groupData.name}`;
      document.getElementById('editor-item-count-badge').innerText = `${this.state.currentItems.length} biển/vạch`;
      document.getElementById('edit-group-name').value = groupData.name || '';
      document.getElementById('edit-group-code').value = groupData.code || '';
      document.getElementById('edit-group-type').value = groupData.type || 'Biển báo giao thông';
      document.getElementById('edit-group-desc').value = groupData.description || '';

      this.renderBulkItems();
      this.updatePinBar(`Phiên biên tập: ${groupData.name}`);
      this.navigate('edit');
    } catch (e) {
      this.showToast('Không thể mở nhóm để biên tập', 'error');
    }
  },

  renderBulkItems(itemsToRender = null) {
    const items = itemsToRender || this.state.currentItems;
    const container = document.getElementById('bulk-items-container');
    container.innerHTML = '';

    document.getElementById('editor-listing-summary').innerText = `Danh sách chi tiết trong nhóm (${items.length} item):`;

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; background:#fafafa; border:1px solid #ddd; border-radius:4px; color:#888;">
          Nhóm này hiện chưa có biển báo nào. Hãy bấm <strong>[+ Thêm biển mới vào nhóm này]</strong> để bắt đầu!
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `bulk-card ${item._isModified ? 'is-modified' : ''}`;
      card.id = `item-card-${item.id}`;

      card.innerHTML = `
        <!-- Image Column -->
        <div class="img-col">
          <div class="img-thumb-container">
            <img src="${item.image || '/anh/default.png'}" class="img-thumb" id="img-preview-${item.id}" alt="${this.escapeHtml(item.name)}" />
          </div>
          <button type="button" class="btn-change-img" onclick="App.triggerChangeImage('${item.id}')">📷 Thay ảnh</button>
          <input type="file" id="file-input-${item.id}" accept="image/*" style="display:none;" onchange="App.handleImageReplacement('${item.id}', this.files)" />
        </div>

        <!-- Middle Column: Tên, Title, Nội dung text -->
        <div>
          <!-- Row 1: Tên biển & Mã -->
          <div style="display:flex; gap:6px; align-items:center; margin-bottom:5px;">
            <label style="font-weight:bold; width:75px; font-size:11.5px;">Tên biển:</label>
            <input type="text" value="${this.escapeHtml(item.name || '')}" style="flex:1; font-weight:bold; color:#004080;" placeholder="Nhập tên biển..." oninput="App.onItemFieldChange('${item.id}', 'name', this.value)" />
            <input type="text" value="${this.escapeHtml(item.code || '')}" style="width:70px; text-align:center;" placeholder="Mã hiệu" oninput="App.onItemFieldChange('${item.id}', 'code', this.value)" />
          </div>

          <!-- Row 2: Title biển (Trường thông tin mới yêu cầu) -->
          <div style="display:flex; gap:6px; align-items:center; margin-bottom:5px;">
            <label style="font-weight:bold; width:75px; font-size:11.5px; color:#bd081c;">Title biển:</label>
            <input type="text" value="${this.escapeHtml(item.title || '')}" style="flex:1; border-color:#d49898;" placeholder="Nhập Title biển..." oninput="App.onItemFieldChange('${item.id}', 'title', this.value)" />
          </div>

          <!-- Row 3: Nội dung text -->
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:2px; font-size:11.5px;">Nội dung text (Quy chuẩn áp dụng):</label>
            <textarea rows="3" style="width:100%; resize:vertical;" placeholder="Nội dung ý nghĩa, quy chuẩn của biển..." oninput="App.onItemFieldChange('${item.id}', 'content', this.value)">${this.escapeHtml(item.content || '')}</textarea>
          </div>
        </div>

        <!-- Right Column: Liên kết thông minh -->
        <div>
          <!-- Smart Link 1: Các biển liên quan -->
          <div style="margin-bottom:8px;">
            <label style="font-weight:bold; font-size:11.5px; color:#b45309; display:block;">
              ⚠️ Các biển liên quan (dễ nhầm lẫn):
            </label>
            <div class="tags-wrap" id="tags-signs-${item.id}">
              ${(item.related_signs || []).map((signName, sIdx) => `
                <span class="tag-badge tag-sign">
                  🛑 ${this.escapeHtml(signName)}
                  <span class="tag-close" onclick="App.removeRelatedSign('${item.id}', ${sIdx})">×</span>
                </span>
              `).join('')}
              <div class="autocomplete-container">
                <button type="button" class="btn-add-tag" onclick="App.openSignAutocomplete('${item.id}')">+ Thêm biển liên quan ▼</button>
                <div class="autocomplete-dropdown" id="dropdown-sign-${item.id}" style="display:none;"></div>
              </div>
            </div>
          </div>

          <!-- Smart Link 2: 600 Câu hỏi lý thuyết liên quan -->
          <div>
            <label style="font-weight:bold; font-size:11.5px; color:#107c41; display:block;">
              📘 Các câu hỏi lý thuyết liên quan (trong 600 câu):
            </label>
            <div class="tags-wrap" id="tags-questions-${item.id}">
              ${(item.related_questions || []).map((qText, qIdx) => `
                <span class="tag-badge tag-question">
                  📘 ${this.escapeHtml(qText)}
                  <span class="tag-close" onclick="App.removeRelatedQuestion('${item.id}', ${qIdx})">×</span>
                </span>
              `).join('')}
              <div class="autocomplete-container">
                <button type="button" class="btn-add-tag" onclick="App.openQuestionAutocomplete('${item.id}')">+ Liên kết câu hỏi lý thuyết ▼</button>
                <div class="autocomplete-dropdown" id="dropdown-question-${item.id}" style="display:none;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Far Right: Xoá item -->
        <div style="text-align:right;">
          <button type="button" class="btn-action-sm" style="color:#c00;" title="Xoá chi tiết biển này khỏi nhóm" onclick="App.removeItemFromEditor('${item.id}')">
            🗑️ Xoá
          </button>
        </div>
      `;

      container.appendChild(card);
    });
  },

  filterItemsInEditor() {
    const q = (document.getElementById('search-in-group-input').value || '').toLowerCase().trim();
    if (!q) return this.renderBulkItems();

    const filtered = this.state.currentItems.filter(item =>
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.content && item.content.toLowerCase().includes(q))
    );
    this.renderBulkItems(filtered);
  },

  onItemFieldChange(itemId, field, value) {
    const item = this.state.currentItems.find(i => i.id === itemId);
    if (item) {
      item[field] = value;
      item._isModified = true;
      const card = document.getElementById(`item-card-${itemId}`);
      if (card) card.classList.add('is-modified');
      this.markModified();
    }
  },

  markModified() {
    this.state.modifiedCount++;
    const statusText = document.getElementById('pin-change-status');
    if (statusText) {
      statusText.innerText = `• Có thay đổi chưa lưu (Sửa đổi lúc ${new Date().toLocaleTimeString()})`;
      statusText.style.color = '#ffc107';
    }
  },

  triggerChangeImage(itemId) {
    const input = document.getElementById(`file-input-${itemId}`);
    if (input) input.click();
  },

  async handleImageReplacement(itemId, files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      try {
        const uploadRes = await this.fetchJson('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, data: base64Data })
        });
        if (uploadRes && uploadRes.url) {
          const item = this.state.currentItems.find(i => i.id === itemId);
          if (item) {
            item.image = uploadRes.url;
            item._isModified = true;
            const imgPreview = document.getElementById(`img-preview-${itemId}`);
            if (imgPreview) imgPreview.src = uploadRes.url;
            this.markModified();
            this.showToast(`Đã thay ảnh mới cho ${item.name}`);
          }
        }
      } catch (err) {
        this.showToast('Không thể upload ảnh mới', 'error');
      }
    };
    reader.readAsDataURL(file);
  },

  addNewItemToEditor() {
    const newItem = {
      id: `item-${Date.now()}`,
      groupId: this.state.currentGroup ? this.state.currentGroup.id : '',
      name: `Biển mới ${this.state.currentItems.length + 1}`,
      code: `MÃ_${this.state.currentItems.length + 1}`,
      image: '/anh/default.png',
      title: `Tiêu đề cho biển mới ${this.state.currentItems.length + 1}`,
      content: 'Nhập nội dung quy chuẩn chi tiết cho biển này...',
      related_signs: [],
      related_questions: [],
      _isModified: true
    };
    this.state.currentItems.unshift(newItem);
    this.renderBulkItems();
    this.markModified();
    this.showToast('Đã thêm một biển mới vào đầu danh sách biên tập!');
  },

  removeItemFromEditor(itemId) {
    const idx = this.state.currentItems.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      const removed = this.state.currentItems.splice(idx, 1)[0];
      this.renderBulkItems();
      this.markModified();
      this.showToast(`Đã gỡ "${removed.name}" khỏi nhóm này.`);
    }
  },

  // -------------------------------------------------------------
  // Related Signs & Questions Autocomplete
  // -------------------------------------------------------------
  removeRelatedSign(itemId, index) {
    const item = this.state.currentItems.find(i => i.id === itemId);
    if (item && item.related_signs) {
      item.related_signs.splice(index, 1);
      item._isModified = true;
      this.renderBulkItems();
      this.markModified();
    }
  },

  removeRelatedQuestion(itemId, index) {
    const item = this.state.currentItems.find(i => i.id === itemId);
    if (item && item.related_questions) {
      item.related_questions.splice(index, 1);
      item._isModified = true;
      this.renderBulkItems();
      this.markModified();
    }
  },

  closeAutocomplete() {
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => {
      d.style.display = 'none';
      d.innerHTML = '';
    });
    this.state.activeDropdown = null;
  },

  openSignAutocomplete(itemId) {
    this.closeAutocomplete();
    const dropdown = document.getElementById(`dropdown-sign-${itemId}`);
    if (!dropdown) return;

    dropdown.style.display = 'block';
    dropdown.innerHTML = `
      <div class="ac-search">
        <input type="text" id="ac-input-sign-${itemId}" placeholder="🔍 Gõ tên hoặc mã biển liên quan..." autofocus oninput="App.filterSignSuggestions('${itemId}', this.value)" />
      </div>
      <ul class="ac-list" id="ac-list-sign-${itemId}"></ul>
      <div style="background:#f4f8fc; border-top:1px solid #e1eaf2; padding:4px 8px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#666;">Chọn để liên kết nhanh</span>
        <button type="button" class="btn-classic" style="padding:1px 6px; font-size:11px;" onclick="App.closeAutocomplete()">Đóng</button>
      </div>
    `;

    this.filterSignSuggestions(itemId, '');
    const input = document.getElementById(`ac-input-sign-${itemId}`);
    if (input) input.focus();
  },

  filterSignSuggestions(itemId, query) {
    const listEl = document.getElementById(`ac-list-sign-${itemId}`);
    if (!listEl) return;
    const q = query.toLowerCase().trim();

    const matches = this.state.allSigns.filter(s =>
      (!q || s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
      listEl.innerHTML = `<li style="padding:8px 10px; color:#888;">Không tìm thấy biển nào phù hợp</li>`;
      return;
    }

    listEl.innerHTML = matches.map(s => `
      <li class="ac-item" onclick="App.addSignToItem('${itemId}', '${this.escapeHtml(s.name)}')">
        ➕ <strong>${this.escapeHtml(s.code || '')}</strong>: ${this.escapeHtml(s.name)}
      </li>
    `).join('');
  },

  addSignToItem(itemId, signName) {
    const item = this.state.currentItems.find(i => i.id === itemId);
    if (item) {
      if (!item.related_signs) item.related_signs = [];
      if (!item.related_signs.includes(signName)) {
        item.related_signs.push(signName);
        item._isModified = true;
        this.renderBulkItems();
        this.markModified();
        this.showToast(`Đã liên kết biển "${signName}"`);
      }
    }
    this.closeAutocomplete();
  },

  openQuestionAutocomplete(itemId) {
    this.closeAutocomplete();
    const dropdown = document.getElementById(`dropdown-question-${itemId}`);
    if (!dropdown) return;

    dropdown.style.display = 'block';
    dropdown.innerHTML = `
      <div class="ac-search">
        <input type="text" id="ac-input-question-${itemId}" placeholder="🔍 Gõ số câu hoặc từ khoá (vd: '353', 'ngược chiều')..." autofocus oninput="App.filterQuestionSuggestions('${itemId}', this.value)" />
      </div>
      <ul class="ac-list" id="ac-list-question-${itemId}"></ul>
      <div style="background:#f4f8fc; border-top:1px solid #e1eaf2; padding:4px 8px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#666;">Kho 600 câu hỏi lý thuyết</span>
        <button type="button" class="btn-classic" style="padding:1px 6px; font-size:11px;" onclick="App.closeAutocomplete()">Đóng</button>
      </div>
    `;

    this.filterQuestionSuggestions(itemId, '');
    const input = document.getElementById(`ac-input-question-${itemId}`);
    if (input) input.focus();
  },

  async filterQuestionSuggestions(itemId, query) {
    const listEl = document.getElementById(`ac-list-question-${itemId}`);
    if (!listEl) return;

    try {
      const matches = await this.fetchJson(`/api/questions/search?q=${encodeURIComponent(query)}`);
      if (matches.length === 0) {
        listEl.innerHTML = `<li style="padding:8px 10px; color:#888;">Không tìm thấy câu hỏi nào phù hợp trong 600 câu</li>`;
        return;
      }

      listEl.innerHTML = matches.map(q => `
        <li class="ac-item" onclick="App.addQuestionToItem('${itemId}', '${this.escapeHtml(q.text)}')">
          ➕ <strong>${this.escapeHtml(q.text)}</strong>
        </li>
      `).join('');
    } catch (e) {
      listEl.innerHTML = `<li style="padding:8px 10px; color:#c00;">Lỗi khi tìm kiếm câu hỏi</li>`;
    }
  },

  addQuestionToItem(itemId, questionText) {
    const item = this.state.currentItems.find(i => i.id === itemId);
    if (item) {
      if (!item.related_questions) item.related_questions = [];
      if (!item.related_questions.includes(questionText)) {
        item.related_questions.push(questionText);
        item._isModified = true;
        this.renderBulkItems();
        this.markModified();
        this.showToast(`Đã liên kết với: ${questionText.substring(0, 40)}...`);
      }
    }
    this.closeAutocomplete();
  },

  // -------------------------------------------------------------
  // Save Changes (Bulk Save)
  // -------------------------------------------------------------
  async saveCurrentGroup() {
    if (this.state.view === 'create') {
      return this.saveNewGroup();
    }

    if (!this.state.currentGroup) return;

    const groupName = document.getElementById('edit-group-name').value.trim();
    if (!groupName) {
      this.showToast('Vui lòng nhập tên nhóm biển báo!', 'error');
      return;
    }

    const payload = {
      name: groupName,
      code: document.getElementById('edit-group-code').value.trim(),
      type: document.getElementById('edit-group-type').value,
      description: document.getElementById('edit-group-desc').value.trim(),
      items: this.state.currentItems.map((item, idx) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        image: item.image,
        title: item.title,
        content: item.content,
        related_signs: item.related_signs || [],
        related_questions: item.related_questions || [],
        order: idx + 1
      }))
    };

    try {
      const res = await this.fetchJson(`/api/groups/${this.state.currentGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.state.modifiedCount = 0;
      this.showToast(`💾 Đã lưu thành công Nhóm "${groupName}" và toàn bộ ${payload.items.length} chi tiết biển!`);
      await this.loadGroups();
      this.navigate('list');
    } catch (err) {
      this.showToast('Lỗi khi lưu dữ liệu nhóm', 'error');
    }
  },

  // -------------------------------------------------------------
  // Create New Group Mode (View 3)
  // -------------------------------------------------------------
  async handleMultiFileUpload(files) {
    if (!files || files.length === 0) return;
    const container = document.getElementById('create-items-container');
    const emptyHint = document.getElementById('create-empty-hint');
    if (emptyHint) emptyHint.style.display = 'none';

    this.showToast(`Đang tải lên ${files.length} ảnh...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      await new Promise(resolve => {
        reader.onload = async (e) => {
          try {
            const uploadRes = await this.fetchJson('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: file.name, data: e.target.result })
            });

            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const newItem = {
              id: `create-item-${Date.now()}-${i}`,
              name: `Biển số: ${cleanBaseName}`,
              code: `MÃ_${i + 1}`,
              image: uploadRes.url,
              title: `Biển số: ${cleanBaseName} - Ý nghĩa và quy chuẩn`,
              content: `Mô tả quy chuẩn cho biển số ${cleanBaseName}...`,
              related_signs: [],
              related_questions: []
            };

            this.appendCreateItemCard(newItem);
            resolve();
          } catch (err) {
            console.error('Upload failed for file:', file.name);
            resolve();
          }
        };
        reader.readAsDataURL(file);
      });
    }

    this.showToast(`✅ Đã tải lên và tạo thành công form cho ${files.length} ảnh!`);
  },

  appendCreateItemCard(item) {
    const container = document.getElementById('create-items-container');
    const card = document.createElement('div');
    card.className = 'bulk-card';
    card.id = item.id;

    card.innerHTML = `
      <div class="img-col">
        <img src="${item.image}" class="img-thumb" alt="${item.name}" />
      </div>
      <div>
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:5px;">
          <label style="font-weight:bold; width:75px; font-size:11.5px;">Tên biển:</label>
          <input type="text" class="ci-name" value="${this.escapeHtml(item.name)}" style="flex:1; font-weight:bold; color:#004080;" />
          <input type="text" class="ci-code" value="${this.escapeHtml(item.code)}" style="width:70px; text-align:center;" />
        </div>
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:5px;">
          <label style="font-weight:bold; width:75px; font-size:11.5px; color:#bd081c;">Title biển:</label>
          <input type="text" class="ci-title" value="${this.escapeHtml(item.title)}" style="flex:1; border-color:#d49898;" />
        </div>
        <div>
          <label style="font-weight:bold; display:block; margin-bottom:2px; font-size:11.5px;">Nội dung text:</label>
          <textarea rows="3" class="ci-content" style="width:100%;">${this.escapeHtml(item.content)}</textarea>
        </div>
      </div>
      <div>
        <div style="margin-bottom:8px;">
          <label style="font-weight:bold; font-size:11.5px; color:#b45309; display:block;">⚠️ Biển liên quan:</label>
          <input type="text" class="ci-related-signs" placeholder="Ví dụ: P.101, P.102 (cách nhau dấu phẩy)..." style="width:100%;" />
        </div>
        <div>
          <label style="font-weight:bold; font-size:11.5px; color:#107c41; display:block;">📘 Câu hỏi lý thuyết (trong 600 câu):</label>
          <input type="text" class="ci-related-questions" placeholder="Ví dụ: Câu 352, Câu 415 (cách nhau dấu phẩy)..." style="width:100%;" />
        </div>
      </div>
      <div style="text-align:right;">
        <button type="button" class="btn-action-sm" style="color:#c00;" onclick="this.closest('.bulk-card').remove()">🗑️</button>
      </div>
    `;

    container.appendChild(card);
  },

  async saveNewGroup() {
    const groupName = document.getElementById('create-group-name').value.trim();
    if (!groupName) {
      this.showToast('Vui lòng nhập Tên nhóm mới!', 'error');
      return;
    }

    const itemCards = document.querySelectorAll('#create-items-container .bulk-card');
    const items = [];
    itemCards.forEach((card, idx) => {
      const name = card.querySelector('.ci-name').value.trim();
      const code = card.querySelector('.ci-code').value.trim();
      const title = card.querySelector('.ci-title').value.trim();
      const content = card.querySelector('.ci-content').value.trim();
      const img = card.querySelector('.img-thumb').src;
      const signsText = card.querySelector('.ci-related-signs').value.trim();
      const questionsText = card.querySelector('.ci-related-questions').value.trim();

      items.push({
        name,
        code,
        title,
        content,
        image: img,
        related_signs: signsText ? signsText.split(',').map(s => s.trim()).filter(Boolean) : [],
        related_questions: questionsText ? questionsText.split(',').map(s => s.trim()).filter(Boolean) : []
      });
    });

    const payload = {
      name: groupName,
      code: document.getElementById('create-group-code').value.trim() || `NHOM_${Date.now()}`,
      type: document.getElementById('create-group-type').value,
      description: document.getElementById('create-group-desc').value.trim(),
      items: items
    };

    try {
      await this.fetchJson('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.showToast(`✨ Đã tạo thành công nhóm "${groupName}" và đồng thời tạo ${items.length} chi tiết biển!`);
      await this.loadGroups();
      this.navigate('list');
    } catch (err) {
      this.showToast('Không thể tạo nhóm mới', 'error');
    }
  },

  // -------------------------------------------------------------
  // Delete Group Feature
  // -------------------------------------------------------------
  promptDeleteGroup(groupId, groupName, itemCount) {
    this.state.deleteTargetGroupId = groupId;
    document.getElementById('modal-delete-group-name').innerText = groupName;
    document.getElementById('modal-delete-group-id').innerText = groupId;
    document.getElementById('modal-delete-item-count').innerText = `${itemCount} biển báo`;
    document.getElementById('modal-delete').style.display = 'flex';
  },

  closeDeleteModal() {
    document.getElementById('modal-delete').style.display = 'none';
    this.state.deleteTargetGroupId = null;
  },

  async confirmDeleteGroup() {
    const chk = document.getElementById('chk-confirm-delete');
    if (!chk.checked) {
      alert('Vui lòng tích xác nhận đồng ý xoá!');
      return;
    }

    const groupId = this.state.deleteTargetGroupId;
    if (!groupId) return;

    try {
      const res = await this.fetchJson(`/api/groups/${groupId}`, { method: 'DELETE' });
      this.closeDeleteModal();
      this.showToast(`🗑️ ${res.message || 'Đã xoá nhóm thành công'}`);
      await this.loadGroups();
    } catch (err) {
      this.showToast('Lỗi khi xoá nhóm', 'error');
    }
  },

  // Navigation between Views
  navigate(viewName) {
    this.state.view = viewName;
    document.getElementById('view-group-list').style.display = viewName === 'list' ? 'block' : 'none';
    document.getElementById('view-bulk-editor').style.display = viewName === 'edit' ? 'block' : 'none';
    document.getElementById('view-create-group').style.display = viewName === 'create' ? 'block' : 'none';
    document.getElementById('view-item-list').style.display = viewName === 'items' ? 'block' : 'none';
    document.getElementById('view-single-item-editor').style.display = viewName === 'item-edit' ? 'block' : 'none';
    document.getElementById('global-toolbar').style.display = viewName === 'list' ? 'flex' : 'none';
    document.getElementById('bottom-pin-bar').style.display = (viewName === 'edit' || viewName === 'create') ? 'flex' : 'none';

    // Tabs & Sidebar highlights
    const isGroups = (viewName === 'list' || viewName === 'edit' || viewName === 'create');
    const tabGroups = document.getElementById('tab-groups');
    const tabItems = document.getElementById('tab-items');
    const sideGroups = document.getElementById('sidebar-nav-groups');
    const sideItems = document.getElementById('sidebar-nav-items');

    if (tabGroups && tabItems) {
      tabGroups.className = `nav-tab ${isGroups ? 'active' : ''}`;
      tabItems.className = `nav-tab ${!isGroups ? 'active' : ''}`;
    }
    if (sideGroups && sideItems) {
      sideGroups.className = isGroups ? 'active' : '';
      sideItems.className = !isGroups ? 'active' : '';
    }

    const titleEl = document.getElementById('page-title-text');
    if (viewName === 'list') {
      titleEl.innerText = 'List Sign Groups - Quản lý Nhóm biển báo & Báo hiệu đường bộ';
    } else if (viewName === 'edit') {
      titleEl.innerText = `Edit Sign Group - ${this.state.currentGroup ? this.state.currentGroup.name : 'Biên tập'}`;
    } else if (viewName === 'create') {
      titleEl.innerText = 'Create New Sign Group - Thêm nhóm biển báo mới';
      this.updatePinBar('Đang tạo Nhóm biển báo mới');
    } else if (viewName === 'items') {
      titleEl.innerText = 'List Individual Signs - Quản lý từng Chi tiết Biển / Vạch riêng';
    } else if (viewName === 'item-edit') {
      titleEl.innerText = 'Edit Sign Item - Biên tập Chi tiết Biển / Vạch';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // -------------------------------------------------------------
  // Quản lý từng Item Biển/Vạch riêng (View 4 & View 5)
  // -------------------------------------------------------------
  async loadItems(page = 1) {
    const groupId = (document.getElementById('filter-individual-group')?.value || '').trim();
    const q = (document.getElementById('search-individual-input')?.value || '').trim();

    try {
      const url = `/api/items?page=${page}&limit=20&groupId=${encodeURIComponent(groupId)}&q=${encodeURIComponent(q)}`;
      const res = await this.fetchJson(url);
      this.state.itemsData = res;
      this.renderItemList();
    } catch (e) {
      console.error('Lỗi tải danh sách chi tiết biển:', e);
    }
  },

  renderItemList() {
    const { items, total, page, limit, totalPages } = this.state.itemsData;
    const tbody = document.getElementById('tbody-individual-items');
    if (!tbody) return;
    tbody.innerHTML = '';

    const statsEl = document.getElementById('items-stats-text');
    if (statsEl) {
      statsEl.innerHTML = `Total: <span style="color:#bd081c; font-size:14px;">${total} chi tiết biển/vạch</span>`;
    }

    const badgeItems = document.getElementById('badge-items-count');
    if (badgeItems) badgeItems.innerText = `${total} biển`;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#888;">Không tìm thấy chi tiết biển/vạch nào phù hợp với bộ lọc</td></tr>`;
      this.renderPagination(0, 1, 1);
      return;
    }

    const startIndex = (page - 1) * limit;
    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      const relatedSignsCount = (item.related_signs || []).length;
      const relatedQuestionsCount = (item.related_questions || []).length;

      tr.innerHTML = `
        <td style="text-align:center; font-weight:bold;">${startIndex + idx + 1}</td>
        <td style="text-align:center;">
          <img src="${item.image || '/anh/default.png'}" alt="${this.escapeHtml(item.name)}" style="width:40px; height:40px; object-fit:contain; border:1px solid #ddd; background:#fff; border-radius:3px; padding:2px;" onerror="this.src='/anh/default.png'" />
        </td>
        <td style="text-align:center;">
          <span style="background:#e8edf3; color:#004080; font-weight:bold; padding:2px 6px; border-radius:3px; font-size:11px;">
            ${this.escapeHtml(item.code || '-')}
          </span>
        </td>
        <td>
          <a href="javascript:void(0)" onclick="App.openSingleItemEditor('${item.id}')" style="color:#004080; font-weight:bold; text-decoration:none; font-size:12.5px;">
            ${this.escapeHtml(item.name)}
          </a>
        </td>
        <td>
          <span style="background:#eaf7ea; border:1px solid #c2e2c2; color:#1b631b; padding:2px 6px; border-radius:3px; font-size:11px; display:inline-block; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${this.escapeHtml(item.groupName || 'Chưa gán')}
          </span>
        </td>
        <td style="color:#555; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(item.title || '')}">
          ${this.escapeHtml(item.title || item.name || '')}
        </td>
        <td style="text-align:center;">
          <span class="tag-badge tag-sign" style="font-size:10.5px; padding:1px 6px;">
            ⚠️ ${relatedSignsCount} biển
          </span>
        </td>
        <td style="text-align:center;">
          <span class="tag-badge tag-question" style="font-size:10.5px; padding:1px 6px;">
            📘 ${relatedQuestionsCount} câu
          </span>
        </td>
        <td style="text-align:center;">
          <span class="icon-edit" title="Sửa riêng chi tiết biển này" onclick="App.openSingleItemEditor('${item.id}')">✏️</span>
          <span class="icon-delete" title="Xoá chi tiết biển này" onclick="App.promptDeleteSingleItem('${item.id}', '${this.escapeHtml(item.name)}')">❌</span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.renderPagination(total, page, totalPages);
  },

  renderPagination(total, page, totalPages) {
    const infoEl = document.getElementById('pagination-info-text');
    const buttonsEl = document.getElementById('pagination-buttons');
    if (!infoEl || !buttonsEl) return;

    if (total === 0) {
      infoEl.innerText = 'Không có kết quả nào';
      buttonsEl.innerHTML = '';
      return;
    }

    const start = (page - 1) * 20 + 1;
    const end = Math.min(page * 20, total);
    infoEl.innerHTML = `Hiển thị <strong>${start} - ${end}</strong> trong tổng số <strong>${total}</strong> chi tiết`;

    let html = '';
    if (page > 1) {
      html += `<button class="btn-classic" onclick="App.loadItems(${page - 1})">&lt;&lt; Trước</button>`;
    }

    const maxDisplayPages = 7;
    let startPage = Math.max(1, page - 3);
    let endPage = Math.min(totalPages, startPage + maxDisplayPages - 1);
    if (endPage - startPage < maxDisplayPages - 1) {
      startPage = Math.max(1, endPage - maxDisplayPages + 1);
    }

    if (startPage > 1) {
      html += `<button class="btn-classic" onclick="App.loadItems(1)">1</button>`;
      if (startPage > 2) html += `<span>...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="btn-classic ${p === page ? 'active' : ''}" onclick="App.loadItems(${p})">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span>...</span>`;
      html += `<button class="btn-classic" onclick="App.loadItems(${totalPages})">${totalPages}</button>`;
    }

    if (page < totalPages) {
      html += `<button class="btn-classic" onclick="App.loadItems(${page + 1})">Sau &gt;&gt;</button>`;
    }

    buttonsEl.innerHTML = html;
  },

  filterItemsList() {
    this.loadItems(1);
  },

  debounceFilterItems() {
    clearTimeout(this.state.debounceTimer);
    this.state.debounceTimer = setTimeout(() => {
      this.loadItems(1);
    }, 300);
  },

  // Open Create Single Item
  openCreateSingleItem() {
    this.state.currentSingleItem = {
      isNew: true,
      name: '',
      code: '',
      groupId: this.state.groups[0] ? this.state.groups[0].id : '',
      image: '/anh/default.png',
      title: '',
      content: '',
      related_signs: [],
      related_questions: []
    };

    document.getElementById('single-editor-header-title').innerText = 'Tạo Chi tiết Biển / Vạch Mới';
    document.getElementById('single-editor-badge-id').innerText = 'Mã mới';
    document.getElementById('single-item-name').value = '';
    document.getElementById('single-item-code').value = '';
    document.getElementById('single-item-group-select').value = this.state.currentSingleItem.groupId;
    document.getElementById('single-item-title').value = '';
    document.getElementById('single-item-content').value = '';
    document.getElementById('single-img-preview').src = '/anh/default.png';
    document.getElementById('single-img-url').value = '';

    this.renderSingleItemTags();
    this.navigate('item-edit');
  },

  // Open Edit Single Item
  async openSingleItemEditor(itemId) {
    try {
      const item = await this.fetchJson(`/api/items/${itemId}`);
      this.state.currentSingleItem = item;

      document.getElementById('single-editor-header-title').innerText = `Biên tập Chi tiết: ${item.name}`;
      document.getElementById('single-editor-badge-id').innerText = `Mã: ${item.code || item.id}`;
      document.getElementById('single-item-name').value = item.name || '';
      document.getElementById('single-item-code').value = item.code || '';
      document.getElementById('single-item-group-select').value = item.groupId || '';
      document.getElementById('single-item-title').value = item.title || '';
      document.getElementById('single-item-content').value = item.content || '';
      document.getElementById('single-img-preview').src = item.image || '/anh/default.png';
      document.getElementById('single-img-url').value = item.image || '';

      this.renderSingleItemTags();
      this.navigate('item-edit');
    } catch (e) {
      this.showToast('Không thể tải thông tin chi tiết biển', 'error');
    }
  },

  renderSingleItemTags() {
    const item = this.state.currentSingleItem;
    if (!item) return;

    // Related signs
    const signsWrap = document.getElementById('single-tags-signs');
    if (signsWrap) {
      const tagsHtml = (item.related_signs || []).map((s, idx) => `
        <span class="tag-badge tag-sign">
          🛑 ${this.escapeHtml(s)}
          <span class="tag-close" onclick="App.removeSingleSignTag(${idx})">×</span>
        </span>
      `).join('');
      signsWrap.innerHTML = `
        ${tagsHtml}
        <div class="autocomplete-container">
          <button type="button" class="btn-add-tag" onclick="App.openSingleSignAutocomplete()">+ Thêm biển liên quan ▼</button>
          <div class="autocomplete-dropdown" id="single-dropdown-sign" style="display:none;"></div>
        </div>
      `;
    }

    // Related questions
    const questionsWrap = document.getElementById('single-tags-questions');
    if (questionsWrap) {
      const qHtml = (item.related_questions || []).map((q, idx) => `
        <span class="tag-badge tag-question">
          📘 ${this.escapeHtml(q)}
          <span class="tag-close" onclick="App.removeSingleQuestionTag(${idx})">×</span>
        </span>
      `).join('');
      questionsWrap.innerHTML = `
        ${qHtml}
        <div class="autocomplete-container">
          <button type="button" class="btn-add-tag" onclick="App.openSingleQuestionAutocomplete()">+ Liên kết câu hỏi lý thuyết ▼</button>
          <div class="autocomplete-dropdown" id="single-dropdown-question" style="display:none;"></div>
        </div>
      `;
    }
  },

  removeSingleSignTag(idx) {
    if (this.state.currentSingleItem && this.state.currentSingleItem.related_signs) {
      this.state.currentSingleItem.related_signs.splice(idx, 1);
      this.renderSingleItemTags();
    }
  },

  removeSingleQuestionTag(idx) {
    if (this.state.currentSingleItem && this.state.currentSingleItem.related_questions) {
      this.state.currentSingleItem.related_questions.splice(idx, 1);
      this.renderSingleItemTags();
    }
  },

  // Save Single Item
  async saveSingleItem() {
    const item = this.state.currentSingleItem;
    if (!item) return;

    const name = document.getElementById('single-item-name').value.trim();
    const groupId = document.getElementById('single-item-group-select').value;
    if (!name) {
      this.showToast('Vui lòng nhập Tên chi tiết biển báo!', 'error');
      return;
    }
    if (!groupId) {
      this.showToast('Vui lòng chọn Nhóm trực thuộc!', 'error');
      return;
    }

    const payload = {
      name,
      code: document.getElementById('single-item-code').value.trim(),
      groupId,
      title: document.getElementById('single-item-title').value.trim(),
      content: document.getElementById('single-item-content').value.trim(),
      image: document.getElementById('single-img-url').value.trim() || '/anh/default.png',
      related_signs: item.related_signs || [],
      related_questions: item.related_questions || []
    };

    try {
      if (item.isNew) {
        await this.fetchJson('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        this.showToast(`✅ Đã tạo thành công chi tiết biển "${name}"!`);
      } else {
        await this.fetchJson(`/api/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        this.showToast(`💾 Đã cập nhật thành công chi tiết biển "${name}"!`);
      }

      await this.loadAllSigns();
      await this.loadGroups();
      await this.loadItems(this.state.itemsData.page || 1);
      this.navigate('items');
    } catch (e) {
      this.showToast('Lỗi khi lưu chi tiết biển', 'error');
    }
  },

  // Single Item Autocomplete Handlers
  openSingleSignAutocomplete() {
    this.closeAutocomplete();
    const dd = document.getElementById('single-dropdown-sign');
    if (!dd) return;
    dd.style.display = 'block';
    dd.innerHTML = `
      <div class="ac-search">
        <input type="text" id="ac-input-single-sign" placeholder="🔍 Gõ tên hoặc mã biển liên quan..." autofocus oninput="App.filterSingleSignSuggestions(this.value)" />
      </div>
      <ul class="ac-list" id="ac-list-single-sign"></ul>
      <div style="background:#f4f8fc; border-top:1px solid #e1eaf2; padding:4px 8px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#666;">Kho 540 biển báo</span>
        <button type="button" class="btn-classic" style="padding:1px 6px; font-size:11px;" onclick="App.closeAutocomplete()">Đóng</button>
      </div>
    `;
    this.filterSingleSignSuggestions('');
    const input = document.getElementById('ac-input-single-sign');
    if (input) input.focus();
  },

  filterSingleSignSuggestions(query) {
    const listEl = document.getElementById('ac-list-single-sign');
    if (!listEl) return;
    const q = query.toLowerCase().trim();
    const matches = this.state.allSigns.filter(s =>
      (!q || s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
      listEl.innerHTML = `<li style="padding:8px 10px; color:#888;">Không tìm thấy biển nào phù hợp</li>`;
      return;
    }

    listEl.innerHTML = matches.map(s => `
      <li class="ac-item" onclick="App.addSignToSingleItem('${this.escapeHtml(s.name)}')">
        ➕ <strong>${this.escapeHtml(s.code || '')}</strong>: ${this.escapeHtml(s.name)}
      </li>
    `).join('');
  },

  addSignToSingleItem(signName) {
    if (!this.state.currentSingleItem) return;
    if (!this.state.currentSingleItem.related_signs) this.state.currentSingleItem.related_signs = [];
    if (!this.state.currentSingleItem.related_signs.includes(signName)) {
      this.state.currentSingleItem.related_signs.push(signName);
      this.renderSingleItemTags();
      this.showToast(`Đã liên kết biển "${signName}"`);
    }
    this.closeAutocomplete();
  },

  openSingleQuestionAutocomplete() {
    this.closeAutocomplete();
    const dd = document.getElementById('single-dropdown-question');
    if (!dd) return;
    dd.style.display = 'block';
    dd.innerHTML = `
      <div class="ac-search">
        <input type="text" id="ac-input-single-question" placeholder="🔍 Gõ số câu hoặc từ khoá (vd: '353', 'ngược chiều')..." autofocus oninput="App.filterSingleQuestionSuggestions(this.value)" />
      </div>
      <ul class="ac-list" id="ac-list-single-question"></ul>
      <div style="background:#f4f8fc; border-top:1px solid #e1eaf2; padding:4px 8px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#666;">Kho 600 câu hỏi sát hạch</span>
        <button type="button" class="btn-classic" style="padding:1px 6px; font-size:11px;" onclick="App.closeAutocomplete()">Đóng</button>
      </div>
    `;
    this.filterSingleQuestionSuggestions('');
    const input = document.getElementById('ac-input-single-question');
    if (input) input.focus();
  },

  async filterSingleQuestionSuggestions(query) {
    const listEl = document.getElementById('ac-list-single-question');
    if (!listEl) return;
    try {
      const matches = await this.fetchJson(`/api/questions/search?q=${encodeURIComponent(query)}`);
      if (matches.length === 0) {
        listEl.innerHTML = `<li style="padding:8px 10px; color:#888;">Không tìm thấy câu hỏi nào phù hợp trong 600 câu</li>`;
        return;
      }
      listEl.innerHTML = matches.map(q => `
        <li class="ac-item" onclick="App.addQuestionToSingleItem('${this.escapeHtml(q.text)}')">
          ➕ <strong>${this.escapeHtml(q.text)}</strong>
        </li>
      `).join('');
    } catch (e) {
      listEl.innerHTML = `<li style="padding:8px 10px; color:#c00;">Lỗi khi tìm kiếm câu hỏi</li>`;
    }
  },

  addQuestionToSingleItem(questionText) {
    if (!this.state.currentSingleItem) return;
    if (!this.state.currentSingleItem.related_questions) this.state.currentSingleItem.related_questions = [];
    if (!this.state.currentSingleItem.related_questions.includes(questionText)) {
      this.state.currentSingleItem.related_questions.push(questionText);
      this.renderSingleItemTags();
      this.showToast(`Đã liên kết với: ${questionText.substring(0, 40)}...`);
    }
    this.closeAutocomplete();
  },

  // Image Upload for Single Item
  async handleSingleItemImage(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const uploadRes = await this.fetchJson('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, data: e.target.result })
        });
        document.getElementById('single-img-preview').src = uploadRes.url;
        document.getElementById('single-img-url').value = uploadRes.url;
        this.showToast(`Đã tải lên ảnh "${file.name}"`);
      } catch (err) {
        this.showToast('Lỗi tải ảnh lên', 'error');
      }
    };
    reader.readAsDataURL(file);
  },

  // Delete Single Item Modal Handlers
  promptDeleteSingleItem(itemId, itemName) {
    this.state.deleteTargetItemId = itemId;
    document.getElementById('modal-delete-item-name').innerText = itemName;
    document.getElementById('modal-delete-item-id').innerText = itemId;
    document.getElementById('modal-delete-single-item').style.display = 'flex';
  },

  closeDeleteSingleModal() {
    document.getElementById('modal-delete-single-item').style.display = 'none';
    this.state.deleteTargetItemId = null;
  },

  async executeDeleteSingleItem() {
    const itemId = this.state.deleteTargetItemId;
    if (!itemId) return;

    try {
      const res = await this.fetchJson(`/api/items/${itemId}`, { method: 'DELETE' });
      this.closeDeleteSingleModal();
      this.showToast(`🗑️ ${res.message || 'Đã xoá chi tiết biển thành công'}`);
      await this.loadAllSigns();
      await this.loadGroups();
      await this.loadItems(this.state.itemsData.page || 1);
    } catch (err) {
      this.showToast('Lỗi khi xoá chi tiết biển', 'error');
    }
  },

  updatePinBar(title) {
    document.getElementById('pin-group-title').innerText = title;
    document.getElementById('pin-auto-save-time').innerText = `(Tự động lưu nháp lúc ${new Date().toLocaleTimeString()})`;
  },

  cancelEditor() {
    if (this.state.modifiedCount > 0) {
      if (!confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn huỷ bỏ không?')) return;
    }
    this.navigate('list');
  },

  previewUserView() {
    alert('👁️ Chế độ Xem trước: Giao diện hiển thị người dùng đang được đồng bộ hoá theo thời gian thực.');
  },

  exportCsv() {
    window.open('/anh/danh-muc-hinh-anh.csv', '_blank');
  },

  reload() {
    this.loadGroups();
    this.showToast('Đã làm mới dữ liệu hệ thống');
  },

  // Toast Notification
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => App.init());
