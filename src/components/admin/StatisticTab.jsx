

export default function StatisticTab({ sessions }) {
  const totalSessions = sessions.length;
  const totalPhotos = sessions.reduce((acc, s) => acc + (s.images ? s.images.length : 0), 0);
  const avgPhotos = totalSessions > 0 ? (totalPhotos / totalSessions).toFixed(1) : 0;
  
  const today = new Date().toDateString();
  const sessionsToday = sessions.filter(s => new Date(s.createdAt || s.created_at).toDateString() === today).length;

  // Simple calculation for a CSS bar chart (Sessions per day for the last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const sessionsPerDay = last7Days.map(dateStr => {
    return {
      date: dateStr.substring(0, 3), // Mon, Tue...
      count: sessions.filter(s => new Date(s.createdAt || s.created_at).toDateString() === dateStr).length
    };
  });

  const maxCount = Math.max(...sessionsPerDay.map(d => d.count), 1);

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', color: '#111' }}>Kiosk Statistics</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #10B981' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Sesi Hari Ini</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{sessionsToday}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Sesi (All Time)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{totalSessions}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Foto Diambil</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{totalPhotos}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e9ecef', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: '#6c757d', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase' }}>Rata-rata Foto / Sesi</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111' }}>{avgPhotos}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e9ecef' }}>
        <h3 style={{ marginTop: 0, marginBottom: '2rem', color: '#111' }}>Aktivitas 7 Hari Terakhir</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #e9ecef' }}>
          {sessionsPerDay.map((day, idx) => {
            const heightPercent = (day.count / maxCount) * 100;
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: '0.8rem', color: '#111', fontWeight: 'bold', marginBottom: '0.5rem' }}>{day.count > 0 ? day.count : ''}</div>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${heightPercent}%`, 
                  background: day.count > 0 ? '#00e58c' : '#f1f3f5',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.5s ease-out'
                }}></div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '2rem', paddingTop: '1rem' }}>
          {sessionsPerDay.map((day, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', color: '#6c757d', fontWeight: 'bold' }}>
              {day.date}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
