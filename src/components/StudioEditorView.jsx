import { useState, useEffect } from 'react';
import { PHOTO_MODES, FRAMES } from '../utils/photoConfig.js';

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 16, height: 16}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const defaultTransform = { x: 0, y: 0, zoom: 1, rotate: 0, flipH: false, flipV: false, filter: 'ORIGINAL' };

const FILTER_CATEGORIES = {
  ALL: [],
  ESSENTIAL: ['ORIGINAL', 'BRIGHTEN', 'DARKEN', 'WARM', 'COOL', 'BLUR', 'SHARPEN', 'BEAUTY', 'CONTRAST +', 'CONTRAST -', 'SATURATION +', 'SATURATION -'],
  RETRO: ['CINEMATIC', 'VINTAGE', 'WARM VINTAGE', 'SEPIA', 'OLD FILM', 'VINTAGE SCR...', 'RETRO PURPLE', 'RETRO TEAL', 'RETRO GOLD', 'RETRO ROSE', 'KODACHROME', 'TECHNICOLOR'],
  FUN: ['GLITCH', 'PURE NOISE', 'PIXELATE', 'ASCII', 'REFLECTION', 'EMBOSS', 'BLOCKY', '3D STRONG', 'NIGHT VISION', 'X-RAY', 'CARTOON', 'COMIC'],
  COOL: ['DREAMY', 'CHROMATIC', 'BLOOM', 'TILT SHIFT']
};

Object.keys(FILTER_CATEGORIES).forEach(k => {
  if (k !== 'ALL') FILTER_CATEGORIES.ALL.push(...FILTER_CATEGORIES[k]);
});

const getMockCssFilter = (filterName) => {
  switch (filterName?.toUpperCase()) {
    case 'B&W': return 'grayscale(100%)';
    case 'NEGATIVE': return 'invert(1)';
    case 'BRIGHTEN': return 'brightness(1.3)';
    case 'DARKEN': return 'brightness(0.7)';
    case 'WARM': return 'sepia(0.4) saturate(1.4) hue-rotate(-15deg)';
    case 'COOL': return 'saturate(1.2) hue-rotate(15deg) contrast(1.1)';
    case 'BLUR': return 'blur(3px)';
    case 'SHARPEN': return 'contrast(1.5) saturate(1.2)';
    case 'BEAUTY': return 'brightness(1.15) contrast(0.9) blur(0.5px)';
    case 'CONTRAST +': return 'contrast(1.4)';
    case 'CONTRAST -': return 'contrast(0.6)';
    case 'SATURATION +': return 'saturate(1.6)';
    case 'SATURATION -': return 'saturate(0.4)';
    case 'CINEMATIC': return 'contrast(1.3) saturate(0.8) sepia(0.3)';
    case 'VINTAGE': return 'sepia(0.6) contrast(1.2) brightness(0.9)';
    case 'SEPIA': return 'sepia(1)';
    case 'OLD FILM': return 'sepia(0.8) contrast(1.5) brightness(0.8) grayscale(0.5)';
    case 'RETRO PURPLE': return 'hue-rotate(45deg) saturate(1.5) contrast(1.2)';
    case 'RETRO TEAL': return 'hue-rotate(-45deg) saturate(1.5) contrast(1.2)';
    case 'NIGHT VISION': return 'sepia(1) hue-rotate(90deg) saturate(3) brightness(1.2)';
    case 'X-RAY': return 'invert(1) grayscale(1) contrast(2)';
    case 'GRAYSCALE': return 'grayscale(1)';
    case 'DREAMY': return 'brightness(1.2) contrast(0.8) blur(1px) saturate(1.2)';
    case 'BLOOM': return 'brightness(1.3) contrast(1.1) blur(0.5px)';
    default: return 'none';
  }
};

export default function StudioEditorView({ photos = [], onNext }) {
  const [step, setStep] = useState('choose_frame'); // 'choose_frame' | 'edit_photo' | 'filter_photo' | 'edit_video' | 'video_settings'
  const [activeFrame, setActiveFrame] = useState(FRAMES[0] || { id: 'default', name: 'Default', tone: '#fff', accent: '#000' });
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [filterCategory, setFilterCategory] = useState('ESSENTIAL');
  const [videoFilter, setVideoFilter] = useState('Normal');

  const [videoSettings, setVideoSettings] = useState({
    speed: 1,
    transition: 'None',
    filter: 'ORIGINAL',
    borderWidth: 0,
    borderColor: '#ffffff'
  });

  const VIDEO_FILTERS = ['Normal', 'B&W', 'Sepia', 'Negative', 'Blur'];

  const [selectedSlot, setSelectedSlot] = useState(0);
  const [slots, setSlots] = useState([
    { photoIdx: 0, ...defaultTransform },
    { photoIdx: 1, ...defaultTransform },
    { photoIdx: 2, ...defaultTransform },
    { photoIdx: 3, ...defaultTransform }
  ]);

  const [gifFrame, setGifFrame] = useState(0);

  useEffect(() => {
    if ((step === 'edit_video' || step === 'video_settings') && photos && photos.length > 0) {
      const baseDelay = 300;
      const speedMult = step === 'video_settings' ? videoSettings.speed : 1;
      const interval = setInterval(() => {
        setGifFrame(prev => prev + 1);
      }, baseDelay / speedMult);
      return () => clearInterval(interval);
    }
  }, [step, photos, videoSettings.speed]);

  const handleNextStep = () => {
    if (step === 'choose_frame') setStep('edit_photo');
    else if (step === 'edit_photo') setStep('filter_photo');
    else if (step === 'filter_photo') setStep('edit_video');
    else if (step === 'edit_video') setStep('video_settings');
    else handleFinish();
  };

  const handleBackStep = () => {
    if (step === 'video_settings') setStep('edit_video');
    else if (step === 'edit_video') setStep('filter_photo');
    else if (step === 'filter_photo') setStep('edit_photo');
    else if (step === 'edit_photo') setStep('choose_frame');
  };

  const handleFinish = () => {
    onNext({
      variants: [{
        template: PHOTO_MODES[1] || { id: 'strip', count: 4 }, 
        frame: activeFrame,
        photos: photos // Ideally, pass transformed photos or config
      }],
      upsellPrice: 0
    });
  };

  const currentSlot = slots[selectedSlot];

  const updateSlot = (key, val) => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[selectedSlot] = { ...newSlots[selectedSlot], [key]: val };
      return newSlots;
    });
  };

  const resetCurrentSlot = () => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[selectedSlot] = { photoIdx: newSlots[selectedSlot].photoIdx, ...defaultTransform };
      return newSlots;
    });
  };

  const thumbnailSlots = Array.from({ length: 5 });

  const allFrames = photos ? photos.reduce((acc, p) => p.frames ? acc.concat(p.frames) : acc.concat([p.src]), []) : [];
  const currentVideoFrameSrc = allFrames.length > 0 ? allFrames[gifFrame % allFrames.length] : '';

  const btnStyle = {
    background: 'transparent',
    border: '1px solid #374151',
    color: 'white',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.8rem'
  };

  return (
    <section className="studio-fullscreen-workspace" style={{
      display: 'grid',
      gridTemplateColumns: '260px minmax(0, 1fr) 380px',
      gap: '1.5rem',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '0 1rem',
      height: 'calc(100svh - 100px)'
    }}>
      
      {/* Left Column: Thumbnails */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '100%', overflowY: 'auto', paddingBottom: '2rem' }}>
        {step === 'video_settings' ? (
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#374151', borderRadius: '4px', border: '2px solid #9ca3af', overflow: 'hidden' }}>
             <img src={currentVideoFrameSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: getMockCssFilter(videoSettings.filter) }} />
          </div>
        ) : (
          thumbnailSlots.map((_, idx) => {
            const photo = photos && photos[idx];
            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (step === 'edit_photo' || step === 'filter_photo') {
                    updateSlot('photoIdx', idx);
                  }
                }}
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  height: '140px',
                  background: photo ? 'transparent' : '#e5e7eb',
                  borderRadius: '16px',
                  border: photo ? '4px solid #374151' : '4px dashed #9ca3af',
                  overflow: 'hidden',
                  cursor: (step === 'edit_photo' || step === 'filter_photo') ? 'pointer' : 'default',
                  opacity: (step === 'choose_frame' || step === 'edit_video') ? 0.7 : 1
              }}>
                {photo && (
                  <img src={photo.src} alt={`Shot ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Center Column: Big Frame Preview */}
      <div style={{ 
        background: '#1a1a1a', 
        borderRadius: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem',
        overflow: 'hidden'
      }}>
        {step === 'video_settings' ? (
          /* Single Large Landscape Video Preview */
          <div style={{
            width: '100%',
            maxWidth: '600px',
            aspectRatio: '16/9',
            background: videoSettings.borderColor,
            padding: `${videoSettings.borderWidth}px`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            transition: 'all 0.3s'
          }}>
             <img 
               src={currentVideoFrameSrc} 
               style={{ 
                 width: '100%', 
                 height: '100%', 
                 objectFit: 'cover', 
                 filter: getMockCssFilter(videoSettings.filter),
                 transition: videoSettings.transition === 'Fade' ? 'opacity 0.2s, filter 0.3s' : 'filter 0.3s'
               }} 
             />
          </div>
        ) : (
          <div className={`frame-${activeFrame.id}`} style={{
          width: '100%',
          maxWidth: '300px',
          aspectRatio: '1/3', // typical photostrip aspect ratio
          background: activeFrame.tone || '#fff',
          border: `8px solid ${activeFrame.tone || '#fff'}`,
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative'
        }}>
           <div style={{ flex: '0 0 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <h4 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'serif', color: activeFrame.accent || '#333' }}>CAMERA</h4>
           </div>
           
           <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {slots.map((slot, i) => {
               const isSelected = selectedSlot === i && (step === 'edit_photo' || step === 'filter_photo');
               
               let photo = null;
               if (slot.photoIdx !== null && photos && photos.length > 0) {
                 const basePhoto = photos[slot.photoIdx];
                 if (step === 'edit_video' && basePhoto.frames && basePhoto.frames.length > 0) {
                   const frameIdx = gifFrame % basePhoto.frames.length;
                   photo = { ...basePhoto, src: basePhoto.frames[frameIdx] };
                 } else {
                   photo = basePhoto;
                 }
               }
               
               let staticFilter = getMockCssFilter(slot.filter || 'ORIGINAL');
               if (staticFilter === 'none') staticFilter = '';
               
               let vidFilter = step === 'edit_video' && videoFilter !== 'Normal' ? getMockCssFilter(videoFilter) : '';
               if (vidFilter === 'none') vidFilter = '';
               
               const combinedFilter = `${staticFilter} ${vidFilter}`.trim() || 'none';

               return (
                 <div 
                   key={i}
                   onClick={() => {
                     if (step === 'choose_frame' || step === 'edit_video') return;
                     setSelectedSlot(i);
                   }}
                   style={{
                     flex: 1,
                     background: '#d1d5db',
                     border: isSelected ? '4px solid #3b82f6' : 'none',
                     cursor: (step === 'choose_frame' || step === 'edit_video') ? 'default' : 'pointer',
                     overflow: 'hidden',
                     position: 'relative',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}
                 >
                   {photo ? (
                     <img 
                       src={photo.src} 
                       style={{
                         width: '100%',
                         height: '100%',
                         objectFit: 'cover',
                         filter: combinedFilter,
                         transition: step === 'edit_video' ? 'none' : 'filter 0.3s, transform 0.3s',
                         transform: `translate(${slot.x}px, ${slot.y}px) scale(${slot.zoom}) rotate(${slot.rotate}deg) scaleX(${slot.flipH ? -1 : 1}) scaleY(${slot.flipV ? -1 : 1})`
                       }}
                     />
                   ) : (
                     <span style={{ fontSize: '2rem', color: '#fff', fontWeight: 'bold' }}>{i + 1}</span>
                   )}
                 </div>
               )
             })}
           </div>

           <div style={{ flex: '0 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.6rem', color: activeFrame.accent || '#666' }}>{activeFrame.name}</span>
           </div>
           {step === 'edit_video' && (
             <div style={{ position: 'absolute', top: -15, right: -15, background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 10 }}>
               GIF PREVIEW
             </div>
           )}
        </div>
        )}
      </div>

      {/* Right Column: Sidebar */}
      <div style={{
        background: '#0f0f0f',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        overflow: 'hidden',
        color: 'white'
      }}>
        {step === 'choose_frame' ? (
          <>
            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.85rem', overflowX: 'auto', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                <MenuIcon /> Filter
              </div>
              <span style={{ cursor: 'pointer', color: activeCategory === 'Baru' ? 'white' : '#9ca3af' }} onClick={() => setActiveCategory('Baru')}>Baru</span>
              <span style={{ cursor: 'pointer', color: activeCategory === 'Trending' ? 'white' : '#9ca3af' }} onClick={() => setActiveCategory('Trending')}>Trending</span>
              <span style={{ cursor: 'pointer', color: activeCategory === 'Sering Dipakai' ? 'white' : '#9ca3af', whiteSpace: 'nowrap' }} onClick={() => setActiveCategory('Sering Dipakai')}>Sering Dipakai</span>
            </div>

            {/* Frames Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {FRAMES.map((frame, idx) => {
                  const isSelected = activeFrame.id === frame.id;
                  return (
                    <div 
                      key={frame.id || idx}
                      onClick={() => setActiveFrame(frame)}
                      className={`frame-${frame.id}`}
                      style={{
                        aspectRatio: '1/2',
                        background: frame.tone || '#fff',
                        border: isSelected ? '3px solid var(--accent)' : `3px solid ${frame.accent || '#ccc'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: isSelected ? '0 0 15px rgba(238, 93, 61, 0.4)' : 'none',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ width: '80%', height: '60%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'rgba(0,0,0,0.3)', zIndex: 5 }}>
                        1
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textAlign: 'center', marginTop: '0.5rem', color: frame.accent, zIndex: 5 }}>
                        {frame.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Button */}
            <button 
              onClick={handleNextStep}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '1rem',
                borderRadius: '999px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(238, 93, 61, 0.3)',
                flexShrink: 0
              }}
            >
              SELANJUTNYA
            </button>
          </>
        ) : step === 'edit_photo' ? (
          /* Edit Photo Panel */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
            {/* Horizontal Move */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.8rem', fontWeight: 'bold' }}>
                <span>HORIZONTAL MOVE: {currentSlot.x}</span>
                <span style={{ cursor: 'pointer' }} onClick={() => updateSlot('x', 0)}>RESET</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <button onClick={() => updateSlot('x', currentSlot.x - 10)} style={btnStyle}>&lt;</button>
                <input type="range" min="-100" max="100" value={currentSlot.x} onChange={(e) => updateSlot('x', Number(e.target.value))} style={{ flex: 1, accentColor: 'white' }} />
                <button onClick={() => updateSlot('x', currentSlot.x + 10)} style={btnStyle}>&gt;</button>
              </div>
            </div>

            {/* Vertical Move */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.8rem', fontWeight: 'bold' }}>
                <span>VERTICAL MOVE: {currentSlot.y}</span>
                <span style={{ cursor: 'pointer' }} onClick={() => updateSlot('y', 0)}>RESET</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <button onClick={() => updateSlot('y', currentSlot.y - 10)} style={btnStyle}>&lt;</button>
                <input type="range" min="-100" max="100" value={currentSlot.y} onChange={(e) => updateSlot('y', Number(e.target.value))} style={{ flex: 1, accentColor: 'white' }} />
                <button onClick={() => updateSlot('y', currentSlot.y + 10)} style={btnStyle}>&gt;</button>
              </div>
            </div>

            {/* Flip H & V */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => updateSlot('flipH', !currentSlot.flipH)} style={{ flex: 1, ...btnStyle, borderRadius: '20px', padding: '0.6rem', width: 'auto', border: currentSlot.flipH ? '1px solid white' : '1px solid #374151', color: currentSlot.flipH ? 'white' : '#9ca3af' }}>◧ FLIP H</button>
              <button onClick={() => updateSlot('flipV', !currentSlot.flipV)} style={{ flex: 1, ...btnStyle, borderRadius: '20px', padding: '0.6rem', width: 'auto', border: currentSlot.flipV ? '1px solid white' : '1px solid #374151', color: currentSlot.flipV ? 'white' : '#9ca3af' }}>⬒ FLIP V</button>
            </div>

            {/* Zoom */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.8rem', fontWeight: 'bold' }}>
                <span>ZOOM: {currentSlot.zoom.toFixed(2)}</span>
                <span style={{ cursor: 'pointer' }} onClick={() => updateSlot('zoom', 1)}>RESET</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <button onClick={() => updateSlot('zoom', Math.max(0.1, currentSlot.zoom - 0.1))} style={btnStyle}>-</button>
                <input type="range" min="0.5" max="3" step="0.1" value={currentSlot.zoom} onChange={(e) => updateSlot('zoom', Number(e.target.value))} style={{ flex: 1, accentColor: 'white' }} />
                <button onClick={() => updateSlot('zoom', currentSlot.zoom + 0.1)} style={btnStyle}>+</button>
              </div>
            </div>

            {/* Rotate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.8rem', fontWeight: 'bold' }}>
                <span>ROTATE: {currentSlot.rotate}°</span>
                <span style={{ cursor: 'pointer' }} onClick={() => updateSlot('rotate', 0)}>RESET</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <input type="range" min="-180" max="180" value={currentSlot.rotate} onChange={(e) => updateSlot('rotate', Number(e.target.value))} style={{ flex: 1, accentColor: 'white' }} />
                <button onClick={() => updateSlot('rotate', currentSlot.rotate - 90)} style={btnStyle}>↺</button>
                <button onClick={() => updateSlot('rotate', currentSlot.rotate + 90)} style={btnStyle}>↻</button>
              </div>
            </div>

            {/* Reset All / Remove */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={resetCurrentSlot} style={{ flex: 1, ...btnStyle, borderRadius: '20px', padding: '0.8rem', width: 'auto' }}>RESET ALL</button>
              <button onClick={() => updateSlot('photoIdx', null)} style={{ flex: 1, ...btnStyle, borderRadius: '20px', padding: '0.8rem', width: 'auto', color: '#ef4444', borderColor: '#ef4444' }}>REMOVE</button>
            </div>

            <div style={{ flex: 1 }}></div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', flexShrink: 0 }}>
              <button onClick={handleBackStep} style={{ flex: 1, background: 'transparent', color: 'white', border: '2px solid #374151', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>BACK</button>
              <button onClick={handleNextStep} style={{ flex: 1, background: 'white', color: 'black', border: 'none', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>NEXT</button>
            </div>
          </div>
        ) : step === 'filter_photo' ? (
          /* Filter Photo Panel */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '1rem', flexShrink: 0 }}>
              {Object.keys(FILTER_CATEGORIES).map(cat => (
                <div 
                  key={cat} 
                  onClick={() => setFilterCategory(cat)}
                  style={{ 
                    flex: 1, 
                    textAlign: 'center', 
                    padding: '0.8rem 0', 
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    color: filterCategory === cat ? 'white' : '#9ca3af',
                    borderBottom: filterCategory === cat ? '2px solid white' : 'none'
                  }}
                >
                  {cat}
                </div>
              ))}
            </div>

            {/* Filter Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {FILTER_CATEGORIES[filterCategory].map((filterName) => {
                  const isSelected = currentSlot.filter === filterName || (!currentSlot.filter && filterName === 'ORIGINAL');
                  const photoSrc = (currentSlot.photoIdx !== null && photos[currentSlot.photoIdx]) ? photos[currentSlot.photoIdx].src : null;
                  
                  return (
                    <div 
                      key={filterName}
                      onClick={() => updateSlot('filter', filterName)}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                      <div style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        background: photoSrc ? `url(${photoSrc}) center/cover` : '#374151',
                        borderRadius: '4px',
                        border: isSelected ? '2px solid white' : '2px solid transparent',
                        filter: getMockCssFilter(filterName)
                      }} />
                      <span style={{ fontSize: '0.6rem', color: isSelected ? 'white' : '#9ca3af', textAlign: 'center', fontWeight: 'bold' }}>
                        {filterName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Apply Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', flexShrink: 0 }}>
              <button onClick={() => updateSlot('filter', 'ORIGINAL')} style={{ flex: 1, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '20px', padding: '0.8rem', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>RESET ALL</button>
              <button onClick={() => setSlots(prev => prev.map(s => ({ ...s, filter: currentSlot.filter || 'ORIGINAL' })))} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', color: 'white', borderRadius: '20px', padding: '0.8rem', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}>APPLY TO ALL</button>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexShrink: 0 }}>
              <button onClick={handleBackStep} style={{ flex: 1, background: 'transparent', color: 'white', border: '2px solid #374151', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>BACK</button>
              <button onClick={handleNextStep} style={{ flex: 1, background: 'white', color: 'black', border: 'none', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>NEXT</button>
            </div>
          </div>
        ) : step === 'edit_video' ? (
          /* Video Filter Panel */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>VIDEO FILTERS</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {VIDEO_FILTERS.map(vf => (
                <button
                  key={vf}
                  onClick={() => setVideoFilter(vf)}
                  style={{
                    background: videoFilter === vf ? '#374151' : 'transparent',
                    border: videoFilter === vf ? '2px solid white' : '1px solid #374151',
                    color: videoFilter === vf ? 'white' : '#9ca3af',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {vf}
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }}></div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexShrink: 0 }}>
              <button onClick={handleBackStep} style={{ flex: 1, background: 'transparent', color: 'white', border: '2px solid #374151', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>BACK</button>
              <button onClick={handleNextStep} style={{ flex: 1, background: 'white', color: 'black', border: 'none', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>NEXT</button>
            </div>
          </div>
        ) : step === 'video_settings' ? (
          /* Video Settings Panel */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0' }}>VIDEO SETTINGS</h3>

            {/* Speed */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.8rem' }}>Speed</div>
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(spd => (
                  <button key={spd} onClick={() => setVideoSettings(s => ({...s, speed: spd}))} style={{ flexShrink: 0, padding: '0.5rem 0.8rem', background: videoSettings.speed === spd ? 'white' : 'transparent', color: videoSettings.speed === spd ? 'black' : '#9ca3af', border: videoSettings.speed === spd ? 'none' : '1px solid #374151', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Transition */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.8rem' }}>Transition</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['None', 'Fade'].map(tr => (
                  <button key={tr} onClick={() => setVideoSettings(s => ({...s, transition: tr}))} style={{ padding: '0.5rem 1rem', background: videoSettings.transition === tr ? 'white' : 'transparent', color: videoSettings.transition === tr ? 'black' : '#9ca3af', border: videoSettings.transition === tr ? 'none' : '1px solid #374151', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    {tr}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.8rem' }}>Filter</div>
              <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {FILTER_CATEGORIES.ESSENTIAL.map(flt => (
                  <div key={flt} onClick={() => setVideoSettings(s => ({...s, filter: flt}))} style={{ cursor: 'pointer', flexShrink: 0, width: '60px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#374151', borderRadius: '4px', border: videoSettings.filter === flt ? '2px solid white' : '2px solid transparent', overflow: 'hidden' }}>
                       <img src={photos && photos[0] ? photos[0].src : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: getMockCssFilter(flt) }} />
                    </div>
                    <span style={{ fontSize: '0.5rem', color: videoSettings.filter === flt ? 'white' : '#9ca3af', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Border Width */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.8rem' }}>
                <span>Border Width</span>
                <span>{videoSettings.borderWidth}px</span>
              </div>
              <input type="range" min="0" max="50" value={videoSettings.borderWidth} onChange={e => setVideoSettings(s => ({...s, borderWidth: Number(e.target.value)}))} style={{ width: '100%', accentColor: 'white' }} />
            </div>

            {/* Border Color */}
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.8rem' }}>Border Color</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="color" value={videoSettings.borderColor} onChange={e => setVideoSettings(s => ({...s, borderColor: e.target.value}))} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent', padding: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'white' }}>{videoSettings.borderColor.toUpperCase()}</span>
              </div>
            </div>

            <div style={{ flex: 1 }}></div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexShrink: 0 }}>
              <button onClick={handleBackStep} style={{ flex: 1, background: 'transparent', color: 'white', border: '2px solid #374151', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>BACK</button>
              <button onClick={handleFinish} style={{ flex: 1, background: 'white', color: 'black', border: 'none', borderRadius: '999px', padding: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>FINISH</button>
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
