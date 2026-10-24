/**
 * Classify native agent_execute as blocked only from explicit error evidence.
 * An explicit success wins over contradictory provider/error text: fail closed.
 */
export function nativeExecutionWasBlocked(attempt){
  const success=attempt?.data?.success;
  if(success===true)return false;
  if(attempt?.isError===true||success===false)return true;
  if(success!==undefined)return false; // Unknown explicit value is not proof of denial.
  const diagnostic=[attempt?.data?.error,attempt?.data?.message]
    .filter(value=>typeof value==='string').join(' ').toLowerCase();
  return /no llm provider|api.key|anthropic|openrouter|ollama|not configured|not set/.test(diagnostic);
}
