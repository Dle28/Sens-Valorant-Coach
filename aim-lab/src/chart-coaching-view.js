export function renderChartCoaching(notes){
 for(const [id,note] of [['error-coaching',notes.error],['pace-coaching',notes.pace],['heatmap-coaching',notes.heat],['improvement-plan',notes.priority]]){
  const panel=document.getElementById(id);if(!panel||!note)continue;panel.replaceChildren();
  if(id==='improvement-plan')panel.className='improvement-card';
  const title=document.createElement(id==='improvement-plan'?'h3':'h4');title.textContent=note.title;
  const evidence=document.createElement('p');evidence.textContent=note.evidence;
  const action=document.createElement('p');action.className='next-step';action.textContent='Phiên tiếp theo: '+note.action;
  panel.append(title,evidence,action);
 }
}
