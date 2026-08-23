// Cliente Supabase
// Importa o SDK do Supabase via CDN

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './config.js';

// Inicializa o cliente Supabase
let supabaseClient = null;

try {
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
  }
} catch (error) {
  console.error('Erro ao inicializar cliente Supabase:', error);
  supabaseClient = null;
}

export const supabase = supabaseClient;

// Função auxiliar para verificar autenticação
export async function checkAuth() {
  if (!supabase) {
    console.error('Supabase client não está disponível');
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Função auxiliar para obter o usuário atual
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requestBetaAccess(email, message = '') {
  const { data, error } = await supabase.rpc('request_beta_access', {
    p_email: email,
    p_mensagem: message || null
  });

  if (error) throw error;
  return data;
}

export async function createBetaInvite() {
  const { data, error } = await supabase.rpc('create_beta_invite');

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function getMyBetaInviteCount(userId) {
  const { count, error } = await supabase
    .from('beta_invites')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId);

  if (error) throw error;
  return count || 0;
}

// Função auxiliar para obter o profile do usuário
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Erro ao buscar profile:', error);
    return null;
  }
  
  return data;
}

// Função auxiliar para obter o profile por username
export async function getUserProfileByUsername(username) {
  if (!supabase || !username) return null;

  // Normalizar o username removendo o @ inicial
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  
  // Tentar primeiro com o username normalizado (sem @)
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', normalizedUsername)
    .maybeSingle();
  
  // Se não encontrar, tentar com @ prefixado
  if (!data && !error) {
    const usernameWithAt = `@${normalizedUsername}`;
    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('username', usernameWithAt)
      .maybeSingle();
    data = result.data;
    error = result.error;
  }
  
  if (error) {
    console.error('Erro ao buscar profile por username:', error);
    return null;
  }
  
  return data;
}

// Função para buscar todos os perfis cadastrados
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar perfis:', error);
    return [];
  }

  return data;
}

// Verificar se usuário é admin ou moderator
export async function getUserRole(userId) {
  if (!userId || typeof userId !== 'string') {
    console.error('getUserRole: userId inválido:', userId);
    return null;
  }

  const { data, error } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar role:', error);
    return null;
  }

  return data?.role || null;
}

// Verificar se usuário é staff (admin ou mod)
export async function isStaff(userId) {
  const role = await getUserRole(userId);
  return role === 'admin' || role === 'moderator';
}

// Verificar se usuário é admin
export async function isAdmin(userId) {
  const role = await getUserRole(userId);
  return role === 'admin';
}

// Função para buscar assuntos de um usuário específico
export async function getUserAssuntos(userId) {
  const { data, error } = await supabase
    .from('assuntos')
    .select('*, profiles!inner(*)')
    .eq('autor', userId)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar assuntos do usuário:', error);
    return [];
  }

  // Mapear profiles para autor para compatibilidade com renderAssunto
  return data.map(assunto => ({
    ...assunto,
    autor: assunto.profiles,
    autor_nome: assunto.profiles?.apelido || assunto.profiles?.nome,
    autor_username: assunto.profiles?.username,
    autor_foto: assunto.profiles?.fotos?.[0]
  }));
}

// Função para buscar todos os status ativos de um usuário (filtra expirados não-fixos >24h)
export async function getUserStatuses(userId) {
  const { data, error } = await supabase
    .from('user_status')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Erro ao buscar status do usuário:', error);
    return [];
  }

  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return (data || []).filter(item => {
    if (item.is_fixed) return true;
    const updatedAt = new Date(item.updated_at || item.created_at).getTime();
    return updatedAt > twentyFourHoursAgo;
  });
}

// Função para buscar status por tipo
export async function getUserStatus(userId, type = null) {
  let query = supabase.from('user_status').select('*').eq('user_id', userId);
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar status:', error);
    return null;
  }

  const list = data || [];
  if (type) {
    const item = list[0];
    if (!item) return null;
    if (!item.is_fixed) {
      const updatedAt = new Date(item.updated_at || item.created_at).getTime();
      if (updatedAt < Date.now() - 24 * 60 * 60 * 1000) return null;
    }
    return item;
  }
  
  return list[0] || null;
}

// Função para criar ou atualizar status de usuário por tipo
export async function upsertUserStatus(userId, statusData) {
  const { data: existingStatus, error: existingError } = await supabase
    .from('user_status')
    .select('id')
    .eq('user_id', userId)
    .eq('type', statusData.type)
    .maybeSingle();

  if (existingError) {
    console.error('Erro ao verificar status existente:', existingError);
    return null;
  }

  const payload = {
    user_id: userId,
    type: statusData.type,
    emoji: statusData.emoji,
    content: statusData.content,
    is_fixed: statusData.is_fixed || false,
    updated_at: new Date().toISOString()
  };

  if (existingStatus && existingStatus.id) {
    const { data, error } = await supabase
      .from('user_status')
      .update(payload)
      .eq('id', existingStatus.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status do usuário:', error);
      return null;
    }

    return data;
  }

  const { data, error } = await supabase
    .from('user_status')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar status do usuário:', error);
    return null;
  }

  return data;
}

// Função para deletar um status (limpar)
export async function deleteUserStatus(userId, type) {
  const { error } = await supabase
    .from('user_status')
    .delete()
    .eq('user_id', userId)
    .eq('type', type);
  
  if (error) {
    console.error('Erro ao deletar status:', error);
    return false;
  }
  return true;
}

// Função para buscar status recentes para o feed (últimas 24h)
export async function getRecentStatuses() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: statuses, error: statusError } = await supabase
    .from('user_status')
    .select('*')
    .gt('updated_at', twentyFourHoursAgo)
    .order('updated_at', { ascending: false });

  if (statusError) {
    console.error('Erro ao buscar status recentes:', statusError);
    return [];
  }

  if (!statuses || statuses.length === 0) {
    return [];
  }

  const userIds = [...new Set(statuses.map(status => status.user_id))];
  const statusIds = statuses.map(status => status.id);

  const [{ data: profiles, error: profileError }, { data: reactions, error: reactionError }, { data: comments, error: commentError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, apelido, nome, username, fotos')
        .in('id', userIds),
      supabase
        .from('status_reactions')
        .select('status_id, emoji, autor')
        .in('status_id', statusIds),
      supabase
        .from('status_comments')
        .select(`
          status_id,
          id,
          texto,
          criado_em,
          autor,
          profiles:autor(id, apelido, nome, username, fotos)
        `)
        .in('status_id', statusIds)
    ]);

  if (profileError) {
    console.warn('Erro ao buscar perfis de status recentes:', profileError);
  }

  if (reactionError) {
    console.warn('Erro ao buscar reações de status recentes:', reactionError);
  }

  if (commentError) {
    console.warn('Erro ao buscar comentários de status recentes:', commentError);
  }

  const profilesById = new Map((profiles || []).map(profile => [profile.id, profile]));
  const reactionsByStatus = new Map();
  const commentsByStatus = new Map();

  (reactions || []).forEach(reaction => {
    if (!reaction || !reaction.status_id) return;
    const list = reactionsByStatus.get(reaction.status_id) || [];
    list.push(reaction);
    reactionsByStatus.set(reaction.status_id, list);
  });

  (comments || []).forEach(comment => {
    if (!comment || !comment.status_id) return;
    const list = commentsByStatus.get(comment.status_id) || [];
    list.push(comment);
    commentsByStatus.set(comment.status_id, list);
  });

  return (statuses || []).map(status => ({
    ...status,
    profiles: profilesById.get(status.user_id) || null,
    reactions: reactionsByStatus.get(status.id) || [],
    comments: commentsByStatus.get(status.id) || []
  }));
}

// Reações de Status
export async function getStatusReactions(statusId) {
  const { data, error } = await supabase
    .from('status_reactions')
    .select('*')
    .eq('status_id', statusId);
  
  if (error) {
    console.error('Erro ao buscar reações do status:', error);
    return [];
  }
  return data || [];
}

export async function toggleStatusReaction(statusId, autorId, emoji = '❤️') {
  // Verificar se já reagiu
  const { data: existing } = await supabase
    .from('status_reactions')
    .select('*')
    .eq('status_id', statusId)
    .eq('autor', autorId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    // Remover
    const { error } = await supabase
      .from('status_reactions')
      .delete()
      .eq('id', existing.id);
    if (error) console.error('Erro ao remover reação:', error);
    return { added: false };
  } else {
    // Adicionar
    const { data, error } = await supabase
      .from('status_reactions')
      .insert({
        status_id: statusId,
        autor: autorId,
        emoji: emoji
      })
      .select()
      .single();
    if (error) console.error('Erro ao adicionar reação:', error);
    return { added: true, data };
  }
}

// Respostas (Comentários) de Status
export async function getStatusComments(statusId) {
  const { data, error } = await supabase
    .from('status_comments')
    .select(`
      *,
      profiles:autor(id, apelido, nome, username, fotos)
    `)
    .eq('status_id', statusId)
    .order('criado_em', { ascending: true });

  if (error) {
    console.error('Erro ao buscar comentários do status:', error);
    return [];
  }
  return data || [];
}

export async function addStatusComment(statusId, autorId, texto) {
  const { data, error } = await supabase
    .from('status_comments')
    .insert({
      status_id: statusId,
      autor: autorId,
      texto: texto
    })
    .select(`
      *,
      profiles:autor(id, apelido, nome, username, fotos)
    `)
    .single();

  if (error) {
    console.error('Erro ao adicionar comentário no status:', error);
    return null;
  }
  return data;
}

export async function deleteStatusComment(commentId) {
  const { error } = await supabase
    .from('status_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Erro ao deletar comentário do status:', error);
    throw error;
  }
  return true;
}

// Função para buscar assuntos fixados de um usuário
export async function getPinnedAssuntos(userId) {
  const { data, error } = await supabase
    .from('assuntos')
    .select('*')
    .eq('autor', userId)
    .eq('fixado', true)
    .order('criado_em', { ascending: false })
    .limit(3);
  
  if (error) {
    console.error('Erro ao buscar assuntos fixados:', error);
    return [];
  }
  
  return data || [];
}

// Função para fixar um assunto (com validação de limite)
export async function pinAssunto(assuntoId, userId) {
  // Primeiro, contar quantos assuntos já estão fixados
  const { count, error: countError } = await supabase
    .from('assuntos')
    .select('id', { count: 'exact', head: true })
    .eq('autor', userId)
    .eq('fixado', true);
  
  if (countError) {
    console.error('Erro ao contar assuntos fixados:', countError);
    return { success: false, error: countError };
  }
  
  if (count >= 3) {
    return { success: false, error: new Error('Limite de 3 assuntos fixados atingido') };
  }
  
  // Fixar o assunto
  const { data, error } = await supabase
    .from('assuntos')
    .update({ fixado: true })
    .eq('id', assuntoId)
    .eq('autor', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao fixar assunto:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
}

// Função para desfixar um assunto
export async function unpinAssunto(assuntoId, userId) {
  const { data, error } = await supabase
    .from('assuntos')
    .update({ fixado: false })
    .eq('id', assuntoId)
    .eq('autor', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao desfixar assunto:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
}

// Função RPC para deletar posts expirados não fixados
export async function deleteExpiredPosts() {
  const { data, error } = await supabase.rpc('delete_expired_posts');
  
  if (error) {
    console.error('Erro ao deletar posts expirados:', error);
    throw error;
  }
  
  return data;
}

// Função RPC para escanear imagens órfãs
export async function scanOrphanedImages() {
  const { data, error } = await supabase.rpc('scan_orphaned_images');
  
  if (error) {
    console.error('Erro ao escanear imagens órfãs:', error);
    throw error;
  }
  
  return data || [];
}

// Deletar imagem do storage usando Storage API
export async function deleteImageFromStorage(path) {
  const { error } = await supabase.storage.from('fotos').remove([path]);
  
  if (error) {
    console.error('Erro ao deletar imagem do storage:', error);
    throw error;
  }
  
  return true;
}

// Funções CRUD para tags

// Buscar todas as tags
export async function getAllTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('nome', { ascending: true });
  
  if (error) {
    console.error('Erro ao buscar tags:', error);
    return [];
  }
  
  return data || [];
}

// Criar nova tag
export async function createTag(nome, emoji) {
  const slug = nome.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const { data, error } = await supabase
    .from('tags')
    .insert({ nome, emoji, slug })
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao criar tag:', error);
    throw error;
  }
  
  return data;
}

// Atualizar tag
export async function updateTag(id, nome, emoji) {
  const slug = nome.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const { data, error } = await supabase
    .from('tags')
    .update({ nome, emoji, slug })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao atualizar tag:', error);
    throw error;
  }
  
  return data;
}

// Deletar tag
export async function deleteTag(id) {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao deletar tag:', error);
    throw error;
  }
  
  return true;
}
export async function votePollOption(assuntoId, optionIndex, visitanteId) {
  if (!assuntoId || typeof optionIndex !== 'number' || !visitanteId) {
    return { success: false, error: new Error('Dados da enquete inválidos') };
  }

  try {
    const { data: existingVote, error: fetchError } = await supabase
      .from('poll_votes')
      .select('id, option_index')
      .eq('assunto', assuntoId)
      .eq('visitante', visitanteId)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao buscar voto da enquete:', fetchError);
      return { success: false, error: fetchError };
    }

    if (existingVote) {
      if (existingVote.option_index === optionIndex) {
        return { success: true, data: existingVote };
      }

      const { error: updateError } = await supabase
        .from('poll_votes')
        .update({ option_index: optionIndex })
        .eq('id', existingVote.id);

      if (updateError) {
        console.error('Erro ao atualizar voto da enquete:', updateError);
        return { success: false, error: updateError };
      }

      return { success: true, data: existingVote };
    }

    const { error: insertError } = await supabase
      .from('poll_votes')
      .insert({ assunto: assuntoId, visitante: visitanteId, option_index: optionIndex });

    if (insertError) {
      console.error('Erro ao inserir voto da enquete:', insertError);
      return { success: false, error: insertError };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao votar na enquete:', error);
    return { success: false, error };
  }
}

export async function getPollVotes(assuntoId) {
  if (!assuntoId) return [];
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('assunto', assuntoId);

  if (error) {
    console.error('Erro ao buscar votos da enquete:', error);
    return [];
  }

  return data || [];
}

// Função para atualizar o perfil do usuário
export async function updateUserProfile(userId, profileData) {
  if (!userId) {
    console.error('UserId não fornecido');
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar perfil:', error);
    return null;
  }

  return data;
}

// Funções de configuração do site
export async function getSiteConfig(key) {
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar site_config:', error);
    return null;
  }

  return data?.value ?? null;
}

export async function setSiteConfig(key, value, userId) {
  const { error } = await supabase
    .from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: 'key' });

  if (error) {
    console.error('Erro ao salvar site_config:', error);
    throw error;
  }

  return true;
}
