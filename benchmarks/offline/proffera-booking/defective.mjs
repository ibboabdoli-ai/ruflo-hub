// Intentionally defective mock: hardcoded 180-minute service and no validation.
// Never use for production reservations.
export function getSlots({opensAt,closesAt,slotStep,duration,bookings}){
  const assumedDuration=180; // Bug: ignores manually configured 210 minutes.
  const result=[];
  for(let start=opensAt;start+assumedDuration<=closesAt;start+=slotStep){
    if(!bookings.some(b=>start<b.end&&start+assumedDuration>b.start))result.push(start);
  }
  return result;
}
