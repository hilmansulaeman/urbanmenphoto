import { supabase } from './supabaseClient';

export async function fetchCustomFrames() {
  if (!supabase) return [];
  
  try {
    const { data: files, error } = await supabase.storage
      .from('potobox-galleries')
      .list('frames');
      
    if (error) throw error;
    if (!files) return [];

    // Filter only files (ignore folders or empty items)
    const validFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder' && f.name !== 'frames' && f.name.endsWith('.png'));

    const frames = validFiles.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('potobox-galleries')
        .getPublicUrl(`frames/${file.name}`);
        
      return {
        id: `custom_${file.name}`,
        name: file.name.split('.')[0], // Remove extension for display name
        url: publicUrl
      };
    });
    
    return frames;
  } catch (err) {
    console.error('Failed to fetch custom frames from Supabase', err);
    return [];
  }
}
