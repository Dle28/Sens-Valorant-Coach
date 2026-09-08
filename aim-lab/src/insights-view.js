function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
const format=(value,unit)=>value===null||!Number.isFinite(value)?'—':unit==='ratio'?(value*100).toFixed(1)+'%':unit==='ms'?Math.round(value).toLocaleString('vi-VN'):value.toLocaleString('vi-VN',{maximumFractionDigits:1});
export function renderInsights(data,panel){
 panel.replaceChildren();if(!data)return;
 const heading=node('div','section-row');heading.append(node('h3','','CÁC CHỈ SỐ NÓI GÌ?'),node('span','tag',data.quality?.level==='usable'?'ĐỦ DỮ LIỆU MÔ TẢ':data.quality?.level==='limited'?'ĐỌC CÙNG GIỚI HẠN':'CẦN THÊM DỮ LIỆU'));panel.append(heading);
 const cards=node('div','insight-cards'+(data.cards.length<=3?' short-grid':''));for(const metric of data.cards){const card=node('article','insight-card');card.append(node('span','insight-label',metric.label));const value=node('strong','insight-value',format(metric.value,metric.unit));if(!['ratio',''].includes(metric.unit))value.append(node('small','',metric.unit==='hits/min'?'trúng/phút':metric.unit));card.append(value);if(metric.unit==='ratio'&&Number.isFinite(metric.value)){const track=node('div','metric-meter'),fill=node('i');fill.style.width=`${Math.max(0,Math.min(100,metric.value*100))}%`;track.append(fill);card.append(track);}card.append(node('p','',metric.explanation));cards.append(card);}panel.append(cards);
 const findings=node('div','insight-findings');for(const finding of data.findings){const article=node('article','finding');article.append(node('h4','',finding.title),node('p','',finding.body));findings.append(article);}const explanation=node('details','quality-details');explanation.append(node('summary','','Giải thích chi tiết các chỉ số'),findings);panel.append(explanation);
 if(data.sizeRows.length){const block=node('section','size-analysis');block.append(node('h3','','KẾT QUẢ THEO KÍCH THƯỚC CẦU'),node('p','small-note','Nhỏ / vừa / lớn là kích thước tương đối trong bài và độ khó này. Vị trí, tốc độ và số mẫu cũng ảnh hưởng kết quả.'));const table=node('table'),thead=node('thead'),hr=node('tr');for(const title of ['Kích thước','Trúng / mục tiêu','Tỷ lệ hoàn thành','Trung vị tới hit'])hr.append(node('th','',title));thead.append(hr);table.append(thead);const tbody=node('tbody');for(const r of data.sizeRows){const row=node('tr');row.append(node('td','',({small:'Nhỏ',medium:'Vừa',large:'Lớn'})[r.label]||r.label),node('td','',`${r.hits} / ${r.trials}`),node('td','',format(r.rate,'ratio')),node('td','',format(r.medianMs,'ms')+(r.medianMs===null?'':' ms')));tbody.append(row);}table.append(tbody);const scroll=node('div','table-scroll');scroll.append(table);block.append(scroll,node('p','small-note','Tỷ lệ = số mục tiêu trúng / mục tiêu đã bắt đầu, gồm cả timeout. Thời gian chỉ tính mục tiêu trúng; ít mẫu chưa đủ để kết luận kích thước nào là điểm yếu.'));panel.append(block);}
 if(data.trackingSizeRows?.length){const section=node('section','size-analysis');section.append(node('h3','','BÁM MỤC TIÊU THEO KÍCH THƯỚC'));const table=node('table'),head=node('tr');for(const label of ['Kích thước','Thời gian hợp lệ','Trên mục tiêu','Tỷ lệ bám'])head.append(node('th','',label));const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');for(const r of data.trackingSizeRows){const row=node('tr');row.append(node('td','',({small:'Nhỏ',medium:'Vừa',large:'Lớn'})[r.label]||r.label),node('td','',(r.validMs/1000).toFixed(1)+'s'),node('td','',(r.onTargetMs/1000).toFixed(1)+'s'),node('td','',format(r.rate,'ratio')));body.append(row);}table.append(body);const scroll=node('div','table-scroll');scroll.append(table);section.append(scroll,node('p','small-note','Mỗi nhóm cộng thời gian frame hợp lệ khi cầu có kích thước đó. Ít thời gian quan sát và các đoạn quỹ đạo khác nhau có thể làm tỷ lệ dao động; đây là so sánh mô tả.'));panel.append(section);}
 if(data.distanceRows?.length)renderDistances(data,panel);
 if(data.quality?.warnings?.length){const details=node('details','quality-details');details.append(node('summary','',`Giới hạn dữ liệu · ${data.quality.warnings.length} lưu ý`));const list=node('ul');for(const warning of data.quality.warnings)list.append(node('li','',warning));details.append(list);panel.append(details);}
}

function renderDistances(data,panel){
 const tracking=data.quality.tracking,section=node('details','quality-details size-analysis');
 section.append(node('summary','','Kết quả theo cự ly bắn'));
 const table=node('table'),head=node('tr'),thead=node('thead'),body=node('tbody');
 const labels={near:'Gần · <12 m',mid:'Trung · 12–<24 m',far:'Xa · ≥24 m'};
 for(const title of tracking?['Cự ly','Trên mục tiêu / hợp lệ','Tỷ lệ bám']:['Cự ly','Trúng / mục tiêu','Hoàn thành','Trung vị tới hit'])head.append(node('th','',title));
 thead.append(head);table.append(thead);
 for(const r of data.distanceRows){
  const row=node('tr');row.append(node('td','',labels[r.band]));
  if(tracking)row.append(node('td','',`${(r.onTargetMs/1000).toFixed(1)} / ${(r.validMs/1000).toFixed(1)} s`),node('td','',format(r.rate,'ratio')));
  else row.append(node('td','',`${r.hits} / ${r.trials}`),node('td','',format(r.rate,'ratio')),node('td','',format(r.medianMs,'ms')+(r.medianMs===null?'':' ms')));
  body.append(row);
 }
 table.append(body);const scroll=node('div','table-scroll');scroll.append(table);section.append(scroll);
 const eligible=data.distanceRows.filter(r=>tracking?r.validMs>=10000:r.trials>=10);
 const sufficient=data.quality.enough&&eligible.length>=2;
 const weakest=sufficient?eligible.reduce((a,b)=>a.rate<=b.rate?a:b):null;
 const spread=sufficient?Math.max(...eligible.map(r=>r.rate))-Math.min(...eligible.map(r=>r.rate)):0;
 section.append(node('p','small-note',weakest&&spread>=.1?`${labels[weakest.band]} có tỷ lệ thấp nhất trong các nhóm đủ mẫu (${format(weakest.rate,'ratio')}). Phiên sau giữ cùng bài và độ khó, chú ý xác nhận tâm trên cầu ở cự ly này. Kích thước cầu và quỹ đạo cũng ảnh hưởng kết quả.`:sufficient?'Chưa thấy chênh lệch từ 10 điểm phần trăm giữa các cự ly đủ mẫu. Tiếp tục giữ cùng bài và độ khó để kiểm tra độ ổn định.':'Cần ít nhất hai nhóm có 10 mục tiêu hoặc 10 giây tracking mỗi nhóm để tìm chênh lệch rõ. Cự ly tính theo đơn vị mét của phòng tập; kích thước cầu và quỹ đạo cũng ảnh hưởng kết quả.'));
 panel.append(section);
}
