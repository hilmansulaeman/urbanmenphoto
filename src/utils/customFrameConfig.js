import { supabase } from './supabaseClient';

export const DEFAULT_FRAME_WIDTH = 1080;
export const DEFAULT_FRAME_HEIGHT = 1920;

export function normalizeFrameConfig(frame = {}) {
  const rawConfig = frame.frameConfig || frame.config || frame;
  const rawSlots = Array.isArray(rawConfig)
    ? rawConfig
    : Array.isArray(rawConfig.slots)
      ? rawConfig.slots
      : [];

  return {
    frameImage: rawConfig.frameImage || rawConfig.url || frame.url || '',
    width: Number(rawConfig.width || frame.width || DEFAULT_FRAME_WIDTH),
    height: Number(rawConfig.height || frame.height || DEFAULT_FRAME_HEIGHT),
    background: rawConfig.background || frame.background || '#fffdf8',
    slots: rawSlots.map((slot, index) => ({
      id: slot.id || `photo${index + 1}`,
      x: Number(slot.x || 0),
      y: Number(slot.y || 0),
      width: Number(slot.width || 0),
      height: Number(slot.height || 0),
      borderRadius: Number(slot.borderRadius || 0),
      rotate: Number(slot.rotate || 0),
    })).filter((slot) => slot.width > 0 && slot.height > 0),
  };
}

export async function fetchCustomFrames() {
  if (!supabase) return [];
  
  try {
    const { data: files, error } = await supabase.storage
      .from('potobox-galleries')
      .list('frames');
      
    if (error) throw error;
    if (!files) return [];

    // Separate PNGs and JSONs
    const pngFiles = files.filter(f => f.name.endsWith('.png'));
    const jsonFiles = files.filter(f => f.name.endsWith('.json'));

    const frames = await Promise.all(pngFiles.map(async file => {
      const baseName = file.name.split('.')[0];
      const { data: { publicUrl } } = supabase.storage
        .from('potobox-galleries')
        .getPublicUrl(`frames/${file.name}`);
        
      let slots = null;
      // Check if corresponding JSON exists
      const hasJson = jsonFiles.find(f => f.name === `${baseName}.json`);
      if (hasJson) {
        try {
          const { data: { publicUrl: jsonUrl } } = supabase.storage
            .from('potobox-galleries')
            .getPublicUrl(`frames/${baseName}.json`);
          const res = await fetch(jsonUrl);
          if (res.ok) {
            slots = await res.json();
          }
        } catch (e) {
          console.error(`Failed to load JSON metadata for ${baseName}`, e);
        }
      }

      const normalized = normalizeFrameConfig({
        ...(Array.isArray(slots) ? { slots } : slots || {}),
        url: publicUrl,
      });
        
      return {
        id: `custom_${file.name}`,
        name: baseName,
        url: publicUrl,
        frameImage: normalized.frameImage,
        width: normalized.width,
        height: normalized.height,
        background: normalized.background,
        slots: normalized.slots,
      };
    }));
    
    return frames;
  } catch (err) {
    console.error('Failed to fetch custom frames from Supabase', err);
    return [];
  }
}
