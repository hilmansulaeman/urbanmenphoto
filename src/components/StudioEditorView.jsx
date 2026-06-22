import { useState } from 'react';
import { PHOTO_MODES, FRAMES } from '../utils/photoConfig.js';

export default function StudioEditorView({ photos, onNext }) {
  // variants: array of { id, template, frame, selectedPhotos: [photoIndex] }
  const [variants, setVariants] = useState([
    {
      id: Date.now(),
      template: PHOTO_MODES[1], // card-4 default
      frame: FRAMES[0], // clean white
      selectedPhotos: []
    }
  ]);
  
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const activeVariant = variants[activeVariantIndex];

  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(null);

  const togglePhoto = (photoIndex) => {
    setVariants(prev => {
      const newVariants = [...prev];
      const variant = { ...newVariants[activeVariantIndex] };
      
      const idxInSelected = variant.selectedPhotos.indexOf(photoIndex);
      if (idxInSelected >= 0) {
        variant.selectedPhotos = variant.selectedPhotos.filter(idx => idx !== photoIndex);
      } else {
        if (variant.selectedPhotos.length < variant.template.count) {
          variant.selectedPhotos = [...variant.selectedPhotos, photoIndex];
        }
      }
      
      newVariants[activeVariantIndex] = variant;
      return newVariants;
    });
  };

  const updateActiveVariant = (key, value) => {
    setVariants(prev => {
      const newVariants = [...prev];
      const variant = { ...newVariants[activeVariantIndex], [key]: value };
      
      if (key === 'template') {
        variant.selectedPhotos = variant.selectedPhotos.slice(0, value.count);
      }
      
      newVariants[activeVariantIndex] = variant;
      return newVariants;
    });
  };

  const addNewVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        id: Date.now(),
        template: PHOTO_MODES[1],
        frame: FRAMES[0],
        selectedPhotos: []
      }
    ]);
    setActiveVariantIndex(variants.length);
  };

  const removeVariant = (index) => {
    if (variants.length <= 1) return;
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    setActiveVariantIndex(Math.min(activeVariantIndex, newVariants.length - 1));
  };

  const handleNext = () => {
    for (const v of variants) {
      if (v.selectedPhotos.length < v.template.count) {
        alert(`Harap lengkapi ${v.template.count} foto pada varian ke-${variants.indexOf(v) + 1}`);
        return;
      }
    }

    const upsellPrice = variants.length > 1 ? (variants.length - 1) * 10000 : 0;
    
    onNext({
      variants: variants.map(v => ({
        template: v.template,
        frame: v.frame,
        photos: v.selectedPhotos.map(idx => photos[idx])
      })),
      upsellPrice
    });
  };

  return (
    <section className="wizard-step studio-editor-workspace" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <header className="wizard-header" style={{ marginBottom: '1rem' }}>
        <h2>Studio Editor</h2>
        <p className="subtitle">Pilih foto, layout, dan frame. Varian pertama <strong>GRATIS</strong>!</p>
      </header>

      {/* Tabs Varian */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {variants.map((v, i) => (
          <button
            key={v.id}
            onClick={() => setActiveVariantIndex(i)}
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '20px',
              border: `2px solid ${i === activeVariantIndex ? 'var(--accent)' : 'var(--line)'}`,
              background: i === activeVariantIndex ? 'var(--accent)' : 'white',
              color: i === activeVariantIndex ? 'white' : 'var(--ink)',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            Varian {i + 1} {i === 0 ? '(Gratis)' : '(+10k)'}
            {variants.length > 1 && (
              <span 
                onClick={(e) => { e.stopPropagation(); removeVariant(i); }}
                style={{ marginLeft: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </span>
            )}
          </button>
        ))}
        <button
          onClick={addNewVariant}
          style={{
            padding: '0.8rem 1.5rem',
            borderRadius: '20px',
            border: '2px dashed var(--muted)',
            background: 'transparent',
            color: 'var(--muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          + Tambah Varian (+10k)
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '2rem', 
        background: '#f9f9f9', 
        padding: '1.5rem', 
        borderRadius: '24px', 
        border: '1px solid var(--line)',
        alignItems: 'start'
      }}>
        
        {/* Kolom Kiri: Canvas Preview & Filmstrip Foto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Canvas Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Preview Layout</h3>
            <div style={{ 
              width: '100%', 
              maxWidth: '450px',
              aspectRatio: '3/4', 
              background: 'white', 
              borderRadius: '12px', 
              border: '1px solid var(--line)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: '15px'
            }}>
              {/* Layout Slots */}
              {activeVariant.template.type === 'strip' ? (
                // --- PREVIEW STRIP ---
                <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                  {/* Left Strip */}
                  <div style={{ flex: 1, borderRight: '1px dashed #ccc', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activeVariant.template.logoPos === 'top' && <div style={{ height: '30px', background: '#ddd', display: 'grid', placeItems: 'center', fontSize: '10px' }}>LOGO</div>}
                    {Array.from({ length: activeVariant.template.count }).map((_, i) => {
                      const photoIdx = activeVariant.selectedPhotos[i];
                      return (
                        <div key={`L${i}`} style={{ flex: 1, background: '#eee', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {photoIdx !== undefined ? <img src={photos[photoIdx].src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#ccc', fontWeight: 'bold', fontSize: '12px' }}>Slot {i+1}</span>}
                        </div>
                      );
                    })}
                    {activeVariant.template.logoPos === 'bottom' && <div style={{ height: '30px', background: '#ddd', display: 'grid', placeItems: 'center', fontSize: '10px' }}>LOGO</div>}
                  </div>
                  {/* Right Strip (Duplicate) */}
                  <div style={{ flex: 1, paddingLeft: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activeVariant.template.logoPos === 'top' && <div style={{ height: '30px', background: '#ddd', display: 'grid', placeItems: 'center', fontSize: '10px' }}>LOGO</div>}
                    {Array.from({ length: activeVariant.template.count }).map((_, i) => {
                      const photoIdx = activeVariant.selectedPhotos[i];
                      return (
                        <div key={`R${i}`} style={{ flex: 1, background: '#eee', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {photoIdx !== undefined ? <img src={photos[photoIdx].src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#ccc', fontWeight: 'bold', fontSize: '12px' }}>Slot {i+1}</span>}
                        </div>
                      );
                    })}
                    {activeVariant.template.logoPos === 'bottom' && <div style={{ height: '30px', background: '#ddd', display: 'grid', placeItems: 'center', fontSize: '10px' }}>LOGO</div>}
                  </div>
                </div>
              ) : activeVariant.template.layout === 'asymmetric' ? (
                // --- PREVIEW ASYMMETRIC (1 Large, 3 Small) ---
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ flex: '0 0 65%', background: '#eee', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeVariant.selectedPhotos[0] !== undefined ? <img src={photos[activeVariant.selectedPhotos[0]].src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#ccc', fontWeight: 'bold' }}>Slot 1 (Besar)</span>}
                  </div>
                  <div style={{ flex: '0 0 35%', display: 'flex', gap: '8px' }}>
                    {[1, 2, 3].map((i) => {
                      const photoIdx = activeVariant.selectedPhotos[i];
                      return (
                        <div key={i} style={{ flex: 1, background: '#eee', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {photoIdx !== undefined ? <img src={photos[photoIdx].src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#ccc', fontWeight: 'bold', fontSize: '10px' }}>Slot {i+1}</span>}
                        </div>
                      );
                    })}
                    {/* Logo Area */}
                    <div style={{ flex: 1, background: '#ddd', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                      LOGO
                    </div>
                  </div>
                </div>
              ) : (
                // --- PREVIEW SINGLE / GRID ---
                <div style={{ 
                  flex: 1, 
                  display: 'grid', 
                  gap: '8px', 
                  gridTemplateColumns: activeVariant.template.layout === 'single' ? '1fr' : '1fr 1fr',
                  gridTemplateRows: activeVariant.template.layout === 'single' ? '1fr' : '1fr 1fr'
                }}>
                  {Array.from({ length: activeVariant.template.count }).map((_, i) => {
                    const photoIdx = activeVariant.selectedPhotos[i];
                    return (
                      <div key={i} style={{ background: '#eee', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {photoIdx !== undefined ? (
                          <img src={photos[photoIdx].src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: '#ccc', fontWeight: 'bold' }}>Slot {i+1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Frame Indicator */}
              <div style={{ position: 'absolute', inset: 0, border: `12px solid ${activeVariant.frame.tone}`, outline: `2px solid ${activeVariant.frame.accent}`, outlineOffset: '-2px', borderRadius: '12px', pointerEvents: 'none' }}></div>
            </div>
          </div>

          {/* Galeri Foto (Filmstrip / Horizontal List) */}
          <div style={{ width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem' }}>Pilih Foto ({activeVariant.selectedPhotos.length}/{activeVariant.template.count})</h3>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              overflowX: 'auto', 
              paddingBottom: '1rem',
              paddingTop: '0.5rem'
            }}>
              {photos.map((photo, index) => {
                const isSelected = activeVariant.selectedPhotos.includes(index);
                const selectionNumber = isSelected ? activeVariant.selectedPhotos.indexOf(index) + 1 : null;
                
                return (
                  <div 
                    key={index}
                    style={{
                      position: 'relative',
                      border: isSelected ? '4px solid var(--accent)' : '4px solid transparent',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      aspectRatio: '3/4',
                      background: '#eee',
                      flex: '0 0 120px',
                      opacity: !isSelected && activeVariant.selectedPhotos.length >= activeVariant.template.count ? 0.5 : 1,
                      transition: 'transform 0.2s',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    <img 
                      src={photo.src} 
                      alt={`Shot ${index}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                      onClick={() => togglePhoto(index)}
                    />
                    
                    {/* Expand/Preview Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewPhotoIndex(index); }}
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title="Lihat Penuh"
                    >
                      🔍
                    </button>

                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: '8px', right: '8px',
                        width: '28px', height: '28px', background: 'var(--accent)', color: 'white',
                        borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }}>{selectionNumber}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Layout & Frame Controls */}
        <div style={{ overflowY: 'auto', maxHeight: '750px', paddingRight: '0.5rem' }}>
          <h3 style={{ marginTop: 0 }}>1. Pilih Layout</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '2rem' }}>
            {PHOTO_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateActiveVariant('template', mode)}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: `2px solid ${activeVariant.template.id === mode.id ? 'var(--accent)' : 'var(--line)'}`,
                  background: activeVariant.template.id === mode.id ? '#fff1eb' : 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {mode.name}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 0 }}>2. Pilih Bingkai (Frame)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            {FRAMES.map((frame) => (
              <button
                key={frame.id}
                onClick={() => updateActiveVariant('frame', frame)}
                style={{
                  padding: '1rem 0.5rem',
                  borderRadius: '12px',
                  border: `2px solid ${activeVariant.frame.id === frame.id ? 'var(--accent)' : 'var(--line)'}`,
                  background: activeVariant.frame.id === frame.id ? '#fff1eb' : 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '40px', height: '40px', background: frame.tone, border: `2px solid ${frame.accent}`, borderRadius: '4px' }}></div>
                {frame.name}
              </button>
            ))}
          </div>
        </div>

      </div>

      <footer className="wizard-footer">
        <button className="primary-action" onClick={handleNext} style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}>
          {variants.length > 1 ? `Bayar Tambahan (Rp ${(variants.length - 1) * 10000}) & Lanjut` : 'Selesai & Cetak'}
        </button>
      </footer>

      {/* Full Preview Modal */}
      {previewPhotoIndex !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <button 
            onClick={() => setPreviewPhotoIndex(null)}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '2.5rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
          
          <img 
            src={photos[previewPhotoIndex].src} 
            alt="Full Preview" 
            style={{
              maxHeight: '80vh',
              maxWidth: '90vw',
              objectFit: 'contain',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          />

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => {
                togglePhoto(previewPhotoIndex);
                setPreviewPhotoIndex(null);
              }}
              className="primary-action"
              style={{
                background: activeVariant.selectedPhotos.includes(previewPhotoIndex) ? '#ef4444' : 'var(--accent)',
                padding: '1rem 2rem'
              }}
            >
              {activeVariant.selectedPhotos.includes(previewPhotoIndex) ? 'Hapus dari Layout' : 'Pilih Foto Ini'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
