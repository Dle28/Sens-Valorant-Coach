export const MAP_CAPTURES=Object.freeze([
 {id:'garden',name:'Lotus B',code:'SITE 01',role:'GÓC HẸP · CỰ LY GẦN',mood:'Giếng trời · Hốc bậc tròn · B Main / Links',brief:'Clear cover trung tâm, giữ B Main và tái chiếm từ các Link.',accent:'#a9d5c5'},
 {id:'piazza',name:'Piazza Court',code:'SITE 02',role:'SÂN MỞ · CỰ LY XA',mood:'Vòm đá · Tầng mái · Ánh nắng',brief:'Ưu tiên crosshair placement ở các mái cao.',accent:'#e0b984'},
 {id:'atrium',name:'Sunken Atrium',code:'SITE 03',role:'GIAO LỘ · CAO ĐỘ',mood:'Sân đá · Mái kính · Nhiều tầng',brief:'Đọc thay đổi cao độ trước khi băng qua.',accent:'#9ccdd2'},
 {id:'foundry',name:'Relay Foundry',code:'SITE 04',role:'HÀNH LANG · NHỊP NHANH',mood:'Xưởng tối · Kim loại · Cầu trục',brief:'Giữ nhịp strafe trong hành lang hẹp.',accent:'#e2ad67'},
]);
export const mapCaptureUrl=(id,view='entry')=>new URL(`./assets/maps/${id}-${view}.png`,import.meta.url).href;
