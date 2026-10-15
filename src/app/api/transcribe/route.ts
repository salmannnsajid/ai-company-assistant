// Speech-to-text: receives a recording from the chat page and transcribes it with Groq's Whisper model.
export async function POST(req: Request) {
  const audio = (await req.formData()).get('audio') as File;

  const form = new FormData();
  form.append('file', audio);
  form.append('model', 'whisper-large-v3-turbo');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) return Response.json({ error: data.error?.message ?? 'Transcription failed' }, { status: 500 });
  return Response.json({ text: (data.text as string).trim() });
}
