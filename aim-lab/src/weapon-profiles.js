// Presentation profiles only. They echo familiar VALORANT weapon roles while
// keeping the training hit logic independent from weapon damage.
export const WEAPONS = Object.freeze({
 classic: Object.freeze({id:'classic',name:'Classic-style',tag:'SIDEARM',role:'Nhẹ, cân bằng, ổn định ở cự ly gần.',damage:'30 / 25 / 20',fireRate:'6.75 rps',magazine:'12 viên',color:'#d8e7ef',accent:'#62dcca',length:.82,weight:.82}),
 phantom: Object.freeze({id:'phantom',name:'Phantom-style',tag:'RIFLE',role:'Rifle ổn định, ưu tiên burst và cự ly gần–trung.',damage:'156 / 140 / 124',fireRate:'11 rps',magazine:'30 viên',color:'#69d8db',accent:'#7b9cff',length:1.12,weight:1}),
 vandal: Object.freeze({id:'vandal',name:'Vandal-style',tag:'RIFLE',role:'Rifle chính xác, one-tap và burst ở mọi lane.',damage:'160 / 160 / 160',fireRate:'9.75 rps',magazine:'25 viên',color:'#e9d6d5',accent:'#ff4655',length:1.18,weight:1.05}),
 sheriff: Object.freeze({id:'sheriff',name:'Sheriff-style',tag:'HEAVY SIDEARM',role:'Sidearm nặng, nhịp bắn chậm và yêu cầu dừng tâm.',damage:'159 / 145 / 123',fireRate:'4 rps',magazine:'6 viên',color:'#d9b27b',accent:'#ff9b58',length:.92,weight:.9}),
});
export const DEFAULT_WEAPON='vandal';
