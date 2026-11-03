// Pre-reviewed pure reference logic for synthetic minute-of-day windows.
// Not Proffera source, not an AI-generated fix, not an operational booking engine.
export function getSlots({opensAt,closesAt,slotStep,duration,bookings}){
  for(const [label,value] of Object.entries({opensAt,closesAt,slotStep,duration})){
    if(!Number.isSafeInteger(value))throw new TypeError(label+' must be an integer minute');
  }
  if(opensAt<0||closesAt>1440||opensAt>=closesAt)
    throw new RangeError('Invalid local time window');
  if(duration<=0||slotStep<=0)throw new RangeError('Positive duration and step required');
  if(!Array.isArray(bookings))throw new TypeError('bookings must be an array');
  for(const b of bookings){
    if(!b||!Number.isSafeInteger(b.start)||!Number.isSafeInteger(b.end))
      throw new TypeError('Booking times must be integer minutes');
    if(b.start<0||b.end>1440||b.end<=b.start)
      throw new RangeError('Invalid booking interval');
  }
  const result=[];
  for(let start=opensAt;start+duration<=closesAt;start+=slotStep){
    const end=start+duration;
    // Half-open intervals: adjacency is allowed, overlap is not.
    if(bookings.every(b=>end<=b.start||start>=b.end))result.push(start);
  }
  return result;
}
