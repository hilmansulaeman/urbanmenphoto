import { supabase } from './supabaseClient';

export const DEFAULT_FRAME_WIDTH = 1080;
export const DEFAULT_FRAME_HEIGHT = 1920;
const DISABLED_CUSTOM_FRAMES_KEY = 'urbanmenphoto_disabled_custom_frames';
const FRAME_USAGE_KEY = 'urbanmenphoto_frame_usage_counts';

const getFrameKey = (frame = {}) => frame.id || frame.name || frame.url || frame.frameImage || '';

export function getDisabledCustomFrameIds() {
  try {
    const raw = window.localStorage.getItem(DISABLED_CUSTOM_FRAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCustomFrameDisabled(frameId, disabled = true) {
  try {
    const ids = new Set(getDisabledCustomFrameIds());
    if (disabled) {
      ids.add(frameId);
    } else {
      ids.delete(frameId);
    }
    window.localStorage.setItem(DISABLED_CUSTOM_FRAMES_KEY, JSON.stringify([...ids]));
    return true;
  } catch (err) {
    console.error('Failed to update disabled frame list', err);
    return false;
  }
}

export function getFrameUsageCounts() {
  try {
    const raw = window.localStorage.getItem(FRAME_USAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recordFrameUsage(frameId) {
  if (!frameId) return false;
  try {
    const counts = getFrameUsageCounts();
    counts[frameId] = Number(counts[frameId] || 0) + 1;
    window.localStorage.setItem(FRAME_USAGE_KEY, JSON.stringify(counts));
    return true;
  } catch (err) {
    console.error('Failed to record frame usage', err);
    return false;
  }
}

export function validateFrameConfig(frame = {}) {
  const normalized = normalizeFrameConfig(frame);
  const errors = [];
  const warnings = [];

  if (!normalized.frameImage) {
    errors.push('File frame PNG tidak ditemukan.');
  }
  if (!Number.isFinite(normalized.width) || normalized.width < 100) {
    errors.push('Lebar frame tidak valid.');
  }
  if (!Number.isFinite(normalized.height) || normalized.height < 100) {
    errors.push('Tinggi frame tidak valid.');
  }
  if (!Number.isFinite(normalized.photoCount) || normalized.photoCount < 1) {
    errors.push('Jumlah foto user belum valid.');
  }
  if (!normalized.slots.length) {
    errors.push('Belum ada slot foto.');
  }

  normalized.slots.forEach((slot, index) => {
    const label = `Slot ${index + 1}`;
    if (slot.width < 40 || slot.height < 40) {
      errors.push(`${label} terlalu kecil.`);
    }
    if (slot.x < 0 || slot.y < 0) {
      errors.push(`${label} berada di luar area frame.`);
    }
    if (slot.x + slot.width > normalized.width || slot.y + slot.height > normalized.height) {
      errors.push(`${label} melewati batas frame.`);
    }

    const sourceMatch = String(slot.source || '').match(/photo_(\d+)/);
    if (sourceMatch) {
      const sourceNumber = Number(sourceMatch[1]);
      if (sourceNumber < 1 || sourceNumber > normalized.photoCount) {
        errors.push(`${label} memakai source foto di luar jumlah foto user.`);
      }
    }
  });

  if (normalized.slots.length > normalized.photoCount) {
    warnings.push('Jumlah slot lebih banyak dari foto user. Ini boleh untuk duplikasi/manual pilih foto, tapi operator perlu cek mapping.');
  }

  const sourceNumbers = normalized.slots
    .map(slot => String(slot.source || '').match(/photo_(\d+)/))
    .filter(Boolean)
    .map(match => Number(match[1]));
  const uniqueSources = new Set(sourceNumbers);
  if (sourceNumbers.length && uniqueSources.size < Math.min(normalized.photoCount, normalized.slots.length)) {
    warnings.push('Ada source foto yang dipakai lebih dari sekali.');
  }

  return {
    isValid: errors.length === 0,
    isUsable: errors.length === 0 && normalized.active !== false,
    errors,
    warnings,
    normalized,
  };
}

export function normalizeFrameConfig(frame = {}) {
  const rawConfig = frame.frameConfig || frame.config || frame;
  const rawSlots = Array.isArray(rawConfig)
    ? rawConfig
    : Array.isArray(rawConfig.slots)
      ? rawConfig.slots
      : [];

  const normalizedSlots = rawSlots.map((slot, index) => ({
    id: slot.id || `photo${index + 1}`,
    source: slot.source || `photo_${index + 1}`,
    x: Number(slot.x || 0),
    y: Number(slot.y || 0),
    width: Number(slot.width || 0),
    height: Number(slot.height || 0),
    borderRadius: Number(slot.borderRadius || 0),
    rotate: Number(slot.rotate || 0),
  })).filter((slot) => slot.width > 0 && slot.height > 0);

  const templateType = rawConfig.templateType || frame.templateType || 'strip';
  const paperSize = rawConfig.paperSize || frame.paperSize || (templateType === 'strip' ? 'strip-2x6' : '4r');
  const printMode = rawConfig.printMode || frame.printMode || (templateType === 'strip' ? 'auto' : 'same');

  return {
    frameImage: rawConfig.frameImage || rawConfig.url || frame.url || '',
    width: Number(rawConfig.width || frame.width || DEFAULT_FRAME_WIDTH),
    height: Number(rawConfig.height || frame.height || DEFAULT_FRAME_HEIGHT),
    background: rawConfig.background || frame.background || '#fffdf8',
    templateType,
    paperSize,
    orientation: rawConfig.orientation || frame.orientation || 'portrait',
    photoCount: Number(rawConfig.photoCount || frame.photoCount || frame.layoutCount || normalizedSlots.length || 3),
    layoutCount: Number(rawConfig.layoutCount || frame.layoutCount || rawConfig.photoCount || normalizedSlots.length || 3),
    printMode,
    printCopies: Number(rawConfig.printCopies || frame.printCopies || (printMode === 'auto' ? 2 : 1)),
    active: rawConfig.active !== false && frame.active !== false,
    slots: normalizedSlots,
  };
}

export async function fetchCustomFrames(options = {}) {
  const {
    includeInvalid = false,
    includeDisabled = false,
  } = options;
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
        
      const frameData = {
        id: `custom_${file.name}`,
        name: baseName,
        url: publicUrl,
        frameImage: normalized.frameImage,
        width: normalized.width,
        height: normalized.height,
        background: normalized.background,
        templateType: normalized.templateType,
        paperSize: normalized.paperSize,
        orientation: normalized.orientation,
        photoCount: normalized.photoCount,
        layoutCount: normalized.layoutCount,
        printMode: normalized.printMode,
        printCopies: normalized.printCopies,
        active: normalized.active,
        slots: normalized.slots,
      };
      const validation = validateFrameConfig(frameData);
      const disabledIds = getDisabledCustomFrameIds();
      const disabled = disabledIds.includes(getFrameKey(frameData));

      const usageCounts = getFrameUsageCounts();
      return {
        ...frameData,
        disabled,
        usageCount: Number(usageCounts[frameData.id] || 0),
        validation,
      };
    }));
    
    return frames
      .filter((frame) => {
        if (!includeDisabled && frame.disabled) return false;
        if (!includeInvalid && !frame.validation?.isUsable) return false;
        return true;
      })
      .sort((a, b) => {
        const disabledSort = Number(Boolean(a.disabled)) - Number(Boolean(b.disabled));
        if (disabledSort !== 0) return disabledSort;
        const validSort = Number(!a.validation?.isValid) - Number(!b.validation?.isValid);
        if (validSort !== 0) return validSort;
        return Number(b.usageCount || 0) - Number(a.usageCount || 0);
      });
  } catch (err) {
    console.error('Failed to fetch custom frames from Supabase', err);
    return [];
  }
}
