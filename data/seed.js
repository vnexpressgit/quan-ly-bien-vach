const fs = require('fs');
const path = require('path');

const anhDir = 'c:/Antigravity/luat-giao-thong-bien-bao/anh';
const mapJsonPath = 'C:/Users/huutrung/.gemini/antigravity/brain/69a211af-7c54-433e-a6ca-c2b345e5d37b/scratch/final_perfect_map.json';
const dbJsonPath = path.join(__dirname, 'db.json');

const filesInAnh = fs.readdirSync(anhDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.png'));
console.log('Total files in anh:', filesInAnh.length);

const rawMap = JSON.parse(fs.readFileSync(mapJsonPath, 'utf8'));

// Predefined 600 Theory Questions (Sample realistic questions)
const sampleQuestions = [
  { id: 351, text: "Câu 351: Biển nào cấm các loại xe cơ giới đi vào kể cả xe máy 3 bánh có thùng?" },
  { id: 352, text: "Câu 352: Biển nào cấm các loại phương tiện đi lại cả hai hướng?" },
  { id: 353, text: "Câu 353: Biển nào báo đường cấm đi ngược chiều?" },
  { id: 354, text: "Câu 354: Gặp biển nào xe lam, xe xích lô máy được phép đi vào?" },
  { id: 355, text: "Câu 355: Biển nào cấm ô tô con?" },
  { id: 356, text: "Câu 356: Biển nào xe tải được phép đi vào?" },
  { id: 357, text: "Câu 357: Biển nào cấm máy kéo kéo theo rơ-moóc?" },
  { id: 358, text: "Câu 358: Biển nào cấm xe chở hàng nguy hiểm?" },
  { id: 359, text: "Câu 359: Biển nào cấm xe khách?" },
  { id: 360, text: "Câu 360: Biển nào cấm xe taxi?" },
  { id: 365, text: "Câu 365: Biển nào cấm rẽ trái?" },
  { id: 366, text: "Câu 366: Biển nào cấm quay đầu xe?" },
  { id: 367, text: "Câu 367: Biển nào cấm ô tô rẽ trái và quay đầu xe?" },
  { id: 370, text: "Câu 370: Biển nào cấm vượt?" },
  { id: 371, text: "Câu 371: Biển nào cấm xe tải vượt?" },
  { id: 375, text: "Câu 375: Biển nào hạn chế tốc độ tối đa cho phép?" },
  { id: 380, text: "Câu 380: Biển nào báo hết đoạn đường cấm vượt?" },
  { id: 382, text: "Câu 382: Biển nào báo hết tốc độ tối đa cho phép?" },
  { id: 385, text: "Câu 385: Biển nào báo hết tất cả các lệnh cấm?" },
  { id: 401, text: "Câu 401: Biển nào báo chỗ ngoặt nguy hiểm vòng bên trái?" },
  { id: 402, text: "Câu 402: Biển nào báo đường hai chiều?" },
  { id: 405, text: "Câu 405: Biển nào báo giao nhau có tín hiệu đèn?" },
  { id: 410, text: "Câu 410: Biển nào giao nhau với đường sắt có rào chắn?" },
  { id: 412, text: "Câu 412: Biển nào báo hiệu đường ngầm có nguy cơ lũ quét?" },
  { id: 415, text: "Câu 415: Gặp biển nào người lái xe không được đi vào?" },
  { id: 420, text: "Câu 420: Thứ tự các xe đi như thế nào là đúng quy tắc giao thông?" },
  { id: 425, text: "Câu 425: Biển nào báo hiệu nơi giao nhau chạy theo vòng xuyến?" },
  { id: 428, text: "Câu 428: Xe nào vi phạm quy tắc giao thông?" },
  { id: 430, text: "Câu 430: Biển nào báo đường dành cho xe thô sơ?" },
  { id: 435, text: "Câu 435: Biển nào báo bắt đầu đường ưu tiên?" },
  { id: 440, text: "Câu 440: Biển nào báo đường một chiều?" },
  { id: 445, text: "Câu 445: Biển nào báo làn đường dành riêng cho xe buýt?" },
  { id: 450, text: "Câu 450: Biển nào báo tốc độ tối thiểu cho phép?" },
  { id: 460, text: "Câu 460: Gặp biển này người lái xe được chạy tốc độ tối đa bao nhiêu?" },
  { id: 478, text: "Câu 478: Biển nào chỉ dẫn nơi cắm trại du lịch?" },
  { id: 479, text: "Câu 479: Biển nào báo hiệu nơi cắm trại và nhà lưu động?" },
  { id: 480, text: "Câu 480: Biển nào chỉ dẫn khách sạn, nhà nghỉ?" },
  { id: 485, text: "Câu 485: Vạch nào dưới đây là vạch phân chia hai chiều xe chạy (vạch tim đường)?" },
  { id: 486, text: "Câu 486: Vạch nào là vạch phân chia các làn xe cùng chiều?" },
  { id: 487, text: "Câu 487: Người lái xe có được phép đè lên vạch nét liền không?" },
  { id: 490, text: "Câu 490: Vạch vàng nét đứt có tác dụng gì?" },
  { id: 492, text: "Câu 492: Trong hình dưới đây xe nào vi phạm biển cấm đi ngược chiều?" },
  { id: 500, text: "Câu 500: Biển nào báo hiệu bắt đầu đường cao tốc?" },
  { id: 510, text: "Câu 510: Biển nào chỉ dẫn trạm dừng nghỉ trên đường cao tốc?" },
  { id: 520, text: "Câu 520: Biển nào chỉ dẫn khoảng cách đến lối ra cao tốc?" }
];

// Generate additional questions up to 600
const all600Questions = [];
for (let i = 1; i <= 600; i++) {
  const found = sampleQuestions.find(q => q.id === i);
  if (found) {
    all600Questions.push(found);
  } else {
    let cat = "Quy tắc giao thông đường bộ";
    if (i >= 300 && i <= 460) cat = "Hệ thống biển báo hiệu đường bộ";
    else if (i > 460) cat = "Giải thế sa hình và kỹ năng lái xe an toàn";
    all600Questions.push({
      id: i,
      text: `Câu ${i}: Nội dung câu hỏi lý thuyết sát hạch số ${i} (${cat})`
    });
  }
}

// 9 Defined Master Groups
const groupsConfig = [
  {
    id: "nhom-bien-cam",
    code: "NHOM_BIEN_CAM",
    name: "Biển báo cấm (Mã P & DP)",
    type: "Biển báo giao thông",
    description: "Nhóm biển biểu thị các điều cấm mà người tham gia giao thông không được vi phạm (Phụ lục B QCVN 41:2019/BGTVT, gồm P.101 đến DP.135).",
    author: "Phạm Thế Đức",
    created_at: "2025-06-05",
    updated_at: "2026-11-10",
    status: "Hiển thị",
    filterKeywords: ["P.", "DP."]
  },
  {
    id: "nhom-nguy-hiem",
    code: "NHOM_NGUY_HIEM",
    name: "Biển báo nguy hiểm và cảnh báo (Mã W)",
    type: "Biển báo giao thông",
    description: "Báo trước cho người tham gia giao thông biết trước các nguy hiểm trên đường để chủ động phòng ngừa xử lý (Phụ lục C, W.201 đến W.247).",
    author: "Nguyễn Thành Danh",
    created_at: "2025-06-05",
    updated_at: "2026-11-10",
    status: "Hiển thị",
    filterKeywords: ["W."]
  },
  {
    id: "nhom-hieu-lenh",
    code: "NHOM_HIEU_LENH",
    name: "Biển hiệu lệnh (Mã R)",
    type: "Biển báo giao thông",
    description: "Biểu thị các hiệu lệnh phải chấp hành như hướng đi phải theo, đường dành riêng cho từng loại xe, tốc độ tối thiểu (Phụ lục D, R.122 đến R.421).",
    author: "Nguyễn Thành Danh",
    created_at: "2025-06-05",
    updated_at: "2026-09-17",
    status: "Hiển thị",
    filterKeywords: ["R."]
  },
  {
    id: "nhom-chi-dan",
    code: "NHOM_CHI_DAN",
    name: "Biển chỉ dẫn (Mã I)",
    type: "Biển báo giao thông",
    description: "Chỉ dẫn hướng đi hoặc các điều cần thiết nhằm giúp người điều khiển phương tiện tham gia giao thông thuận lợi (Phụ lục E, I.401 đến I.449).",
    author: "Phạm Thế Đức",
    created_at: "2025-06-05",
    updated_at: "2026-11-10",
    status: "Hiển thị",
    filterKeywords: ["I.", "Biển số I."]
  },
  {
    id: "nhom-bien-phu",
    code: "NHOM_BIEN_PHU",
    name: "Biển phụ và biển viết bằng chữ (Mã S)",
    type: "Biển báo giao thông",
    description: "Thuyết minh bổ sung ý nghĩa cho các biển chính (Phụ lục F, S.501 đến S.510, S.G, S.H...).",
    author: "Nguyễn Thành Danh",
    created_at: "2025-06-05",
    updated_at: "2026-06-05",
    status: "Hiển thị",
    filterKeywords: ["S.", "S.G", "S.H"]
  },
  {
    id: "nhom-vach-ke-duong",
    code: "NHOM_VACH_KE_DUONG",
    name: "Vạch kẻ đường (Mã G)",
    type: "Vạch kẻ đường",
    description: "Dạng báo hiệu đường bộ dùng vạch sơn phân chia làn đường, tim đường, vạch dừng xe, vạch người đi bộ (Phụ lục G, Vạch 1.1 đến Vạch 9.6).",
    author: "Nguyễn Thành Danh",
    created_at: "2025-06-05",
    updated_at: "2026-09-17",
    status: "Hiển thị",
    filterKeywords: ["Vạch", "vạch", "G."]
  },
  {
    id: "nhom-cao-toc",
    code: "NHOM_CAO_TOC",
    name: "Biển chỉ dẫn trên đường cao tốc (Mã IE)",
    type: "Biển cao tốc",
    description: "Chỉ dẫn khoảng cách, lối ra, trạm dừng nghỉ, phân làn cao tốc theo Điều 50 - 51 và Phụ lục IE.",
    author: "Phạm Thế Đức",
    created_at: "2025-06-05",
    updated_at: "2026-06-05",
    status: "Hiển thị",
    filterKeywords: ["IE.", "cao tốc"]
  },
  {
    id: "nhom-thiet-bi-khac",
    code: "NHOM_THIET_BI_KHAC",
    name: "Thiết bị báo hiệu khác (Cột km, cọc tiêu, cọc mốc)",
    type: "Thiết bị báo hiệu",
    description: "Cột kilômét cột thấp, cột cao, cọc tiêu, cọc H, cọc mốc lộ giới theo Phụ lục I.",
    author: "Nguyễn Thành Danh",
    created_at: "2025-06-05",
    updated_at: "2026-06-05",
    status: "Hiển thị",
    filterKeywords: ["Cột", "Cọc", "mốc"]
  },
  {
    id: "nhom-bieu-tuong",
    code: "NHOM_BIEU_TUONG",
    name: "Biểu tượng phương tiện & dịch vụ công cộng",
    type: "Biểu tượng",
    description: "Biểu tượng các loại xe cơ giới, thô sơ và biểu tượng dịch vụ công cộng ghép trên biển báo (Bảng 3, Hình 5).",
    author: "Nguyễn Thành Danh",
    created_at: "2025-06-05",
    updated_at: "2026-06-05",
    status: "Hiển thị",
    filterKeywords: ["Biểu tượng", "Bảng 3"]
  }
];

// Helper to determine group ID for each file
function getGroupIdForName(name) {
  if (name.includes('Biển số P.') || name.includes('Biển số DP.')) return 'nhom-bien-cam';
  if (name.includes('Biển số W.')) return 'nhom-nguy-hiem';
  if (name.includes('Biển số R.')) return 'nhom-hieu-lenh';
  if (name.includes('Biển số IE.')) return 'nhom-cao-toc';
  if (name.includes('Biển số I.') && !name.includes('IE.')) return 'nhom-chi-dan';
  if (name.includes('Biển số S.') || name.includes('S.G') || name.includes('S.H')) return 'nhom-bien-phu';
  if (name.includes('Vạch') || name.includes('vạch') || name.includes('G.')) return 'nhom-vach-ke-duong';
  if (name.includes('Cột') || name.includes('Cọc') || name.includes('mốc')) return 'nhom-thiet-bi-khac';
  if (name.includes('Biểu tượng')) return 'nhom-bieu-tuong';
  return 'nhom-chi-dan';
}

// Generate Items
const allItems = [];
let itemIdx = 1;

for (const fileName of filesInAnh) {
  const baseNameNoExt = fileName.replace(/\.[^/.]+$/, '');
  const ext = path.extname(fileName).toLowerCase();
  const groupId = getGroupIdForName(baseNameNoExt);

  // Extract sign code if any (e.g. P.101, W.201a, R.301, I.433b...)
  let code = '';
  const codeMatch = baseNameNoExt.match(/(?:Biển số|Biển|Vạch)\s+([A-Za-z0-9\.\,\(\)\-]+)/i);
  if (codeMatch) {
    code = codeMatch[1].trim();
  } else {
    code = `ITEM-${itemIdx}`;
  }

  // Related signs
  const relatedSigns = [];
  if (code.startsWith('P.101')) relatedSigns.push('P.102: Cấm đi ngược chiều', 'P.112: Cấm người đi bộ');
  else if (code.startsWith('P.102')) relatedSigns.push('P.101: Đường cấm', 'I.407a: Đường một chiều');
  else if (code.startsWith('P.103a')) relatedSigns.push('P.103b: Cấm ô tô rẽ phải', 'P.104: Cấm xe máy', 'P.106a: Cấm ô tô tải');
  else if (code.startsWith('P.106a')) relatedSigns.push('P.106b: Cấm tải trọng', 'P.107: Cấm ô tô khách');
  else if (code.startsWith('DP.134')) relatedSigns.push('DP.135: Hết tất cả lệnh cấm', 'P.127: Tốc độ tối đa cho phép');
  else if (code.startsWith('W.201')) relatedSigns.push('W.202: Chỗ ngoặt liên tiếp', 'W.204: Đường hai chiều');
  else if (code.startsWith('R.301')) relatedSigns.push('R.302: Hướng đi vòng chướng ngại vật', 'I.407a: Đường một chiều');
  else if (code.startsWith('I.433')) relatedSigns.push('I.433a: Nơi nghỉ mát', 'I.433b: Nơi cắm trại', 'I.433c: Nhà lưu động');

  // Related questions
  const relatedQuestions = [];
  if (code.startsWith('P.101')) relatedQuestions.push('Câu 352: Biển nào cấm các phương tiện đi lại cả hai hướng?', 'Câu 415: Gặp biển nào người lái xe không được đi vào?');
  else if (code.startsWith('P.102')) relatedQuestions.push('Câu 353: Biển nào báo đường cấm đi ngược chiều?', 'Câu 420: Thứ tự các xe đi như thế nào là đúng quy tắc?');
  else if (code.startsWith('P.103a')) relatedQuestions.push('Câu 355: Biển nào cấm ô tô con?', 'Câu 356: Biển nào xe tải được phép đi vào?', 'Câu 428: Xe nào vi phạm quy tắc?');
  else if (code.startsWith('DP.134')) relatedQuestions.push('Câu 382: Biển nào báo hết tốc độ tối đa cho phép?', 'Câu 460: Gặp biển này người lái xe được chạy tối đa bao nhiêu?');
  else if (code.startsWith('W.201')) relatedQuestions.push('Câu 401: Biển nào báo chỗ ngoặt nguy hiểm vòng bên trái?');
  else if (code.startsWith('I.433')) relatedQuestions.push('Câu 478: Biển nào chỉ dẫn nơi cắm trại du lịch?', 'Câu 479: Biển nào báo nơi cắm trại và nhà lưu động?');

  allItems.push({
    id: `item-${itemIdx}`,
    groupId: groupId,
    name: baseNameNoExt,
    code: code,
    image: `/anh/${fileName}`,
    title: `${baseNameNoExt}: Ý nghĩa & Quy chuẩn áp dụng mới nhất`,
    content: `Quy định kỹ thuật và ý nghĩa sử dụng chi tiết của ${baseNameNoExt} theo Quy chuẩn kỹ thuật quốc gia về báo hiệu đường bộ QCVN 41:2019/BGTVT. Người tham gia giao thông có trách nhiệm chấp hành nghiêm chỉnh quy định của biển này.`,
    related_signs: relatedSigns,
    related_questions: relatedQuestions,
    order: itemIdx,
    created_at: "2025-06-05",
    updated_at: "2026-11-10"
  });

  itemIdx++;
}

console.log('Total items created:', allItems.length);

// Calculate items per group
const groups = groupsConfig.map(g => {
  const count = allItems.filter(item => item.groupId === g.id).length;
  return {
    ...g,
    item_count: count
  };
});

const dbData = {
  groups: groups,
  items: allItems,
  questions: all600Questions
};

fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Database initialized successfully at:', dbJsonPath);
