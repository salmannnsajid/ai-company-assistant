// Failures reach the chat in many shapes: a provider's JSON payload, an HTTP status, a dropped
// connection. Turn whatever arrived into one plain sentence the user can act on.
export function errorText(error: Error): string {
  const raw = error.message ?? '';
  let detail = raw;
  try {
    const parsed = JSON.parse(raw);
    detail = parsed?.error?.message ?? parsed?.message ?? raw;
  } catch {
    detail = raw.match(/"message"\s*:\s*"([^"]+)"/)?.[1] ?? raw;
  }
  detail = detail.trim();

  if (/rate.?limit|too many requests|quota|\b429\b/i.test(detail))
    return 'The free model is busy right now. Wait about 10 seconds and try again.';
  if (/failed to fetch|network|offline|econn|socket|timed? ?out|abort/i.test(detail))
    return 'Could not reach the server. Check your connection and try again.';
  if (/unauthori[sz]|forbidden|api key|\b40[13]\b/i.test(detail))
    return 'The server could not sign in to the model. Try again shortly.';
  if (/overload|unavailable|bad gateway|\b5\d\d\b/i.test(detail))
    return 'The model is temporarily unavailable. Try again in a moment.';

  // Anything else: keep the server's wording only if it reads like a sentence that helps —
  // not a payload, and not a placeholder like "An error occurred."
  const useful =
    detail.length > 0 &&
    detail.length < 200 &&
    !/^[{[<]/.test(detail) &&
    !/^(an error occurred|internal server error|error)\.?$/i.test(detail);
  return useful ? detail : 'Something went wrong while answering that. Please try again.';
}
