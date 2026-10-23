import { ImageResponse } from 'next/og';

// The share card. Next serves it as /opengraph-image and adds the og:image tags.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Brightloop Assistant — ask about projects, sprints and the team';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          padding: 96,
          background: '#0b0d12',
          color: '#e8eaf0',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: '#6d68f5', letterSpacing: 2 }}>BRIGHTLOOP STUDIO</div>
        <div style={{ display: 'flex', fontSize: 86, fontWeight: 700 }}>Brightloop Assistant</div>
        <div style={{ display: 'flex', fontSize: 38, color: '#8b93a3', lineHeight: 1.4 }}>
          Projects, sprints and team workload — answered from the company database.
        </div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 26, color: '#5b6373' }}>Built by Salman Sajid</div>
      </div>
    ),
    size,
  );
}
