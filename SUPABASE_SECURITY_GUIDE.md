# 🔐 Guía de Seguridad Supabase - Correcciones Requeridas

## Errores Encontrados

### 1. ✅ RLS Disabled (9 tablas)
**Estado:** CRÍTICO  
**Tablas afectadas:** bookmarks, reports, presence, retweets, media, polls, poll_options, poll_votes, user_2fa

**Solución:**
```sql
-- Ejecuta este archivo en SQL Editor
supabase/fix_rls_simple.sql
```

### 2. ⚠️ Function Search Path Mutable (27 funciones)
**Estado:** ADVERTENCIA  
**Funciones afectadas:** search_users, search_posts, is_following, get_user_suggestions, is_blocked, block_user, unblock_user, toggle_like, get_unread_notifications_count, mark_notifications_as_read, get_timeline_feed, update_followers_count, update_followers_count_delete, update_posts_count, update_posts_count_delete, update_comments_count, update_comments_count_delete, create_like_notification, create_follow_notification, create_comment_notification, toggle_retweet, update_presence, create_poll, vote_poll, create_media_entry, enable_2fa, disable_2fa

**Solución:**
```sql
-- Ejecuta este archivo en SQL Editor
supabase/fix_function_search_path.sql
```

### 3. ⚠️ Leaked Password Protection Disabled
**Estado:** ADVERTENCIA  
**Ubicación:** Auth Settings

**Solución Manual:**
1. Ve a https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/settings/auth
2. Busca "Password strength and protection"
3. Habilita "Protect against compromised passwords (HaveIBeenPwned)"

---

## 📋 Pasos Rápidos

### Paso 1: Habilitar RLS (3 minutos)
```
1. https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/sql/new
2. Copia contenido: supabase/fix_rls_simple.sql
3. Click "Run"
4. Verifica en Database > Security > Policies
```

### Paso 2: Corregir Funciones (5 minutos)
```
1. https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/sql/new
2. Copia contenido: supabase/fix_function_search_path.sql
3. Click "Run"
4. Verifica en Database > Functions
```

### Paso 3: Habilitar Password Protection (2 minutos)
```
1. https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/settings/auth
2. Busca "Compromised password detection"
3. Toggle ON
4. Guarda
```

---

## 🔍 Verificación

Después de ejecutar:
```
1. Ve a https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/database-linter
2. Verifica que todos los errores se hayan resuelto
3. Solo quedarán advertencias menores (OK)
```

---

## 📝 Resumen de Cambios

| Cambio | Antes | Después |
|--------|-------|---------|
| RLS Status | ❌ Deshabilitado | ✅ Habilitado |
| Políticas | ❌ Ninguna | ✅ Básicas (true) |
| Search Path | ❌ Mutable | ✅ SET search_path = public |
| Password Protection | ❌ Deshabilitado | ✅ Habilitado |

---

## ⚡ Quick Links

- 🔗 SQL Editor: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/sql/new
- 🔗 Auth Settings: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/settings/auth
- 🔗 Database Linter: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/database-linter
- 🔗 Security Policies: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/database/policies

---

**⏱️ Tiempo Total:** ~10 minutos
