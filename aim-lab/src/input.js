// Request OS-unadjusted movement, never silently retry with adjusted input.
// Promise acceptance is not independent verification of physical sensor counts.
export async function requestUnadjustedInput(element, release) {
 if(typeof element.requestPointerLock!=='function')throw new Error('Trình duyệt không hỗ trợ khóa chuột.');
 try {
  const result=element.requestPointerLock({unadjustedMovement:true});
  if(!result||typeof result.then!=='function')throw new Error('Trình duyệt không xác nhận yêu cầu input chưa qua xử lý.');
  await result;
 } catch(error) {
  release();
  throw error;
 }
}
