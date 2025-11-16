# 💬 Sistema de Mensajes Directos Completo

## 📋 Descripción

Sistema de chat/mensajería directa en tiempo real con todas las features de una red social moderna.

### Características Principales

✅ **Mensajería:**
- Chat directo entre usuarios
- Mensajes en tiempo real
- Edición de mensajes
- Eliminación de mensajes
- Soporte para multimedia (imágenes, videos, archivos)

✅ **Estado y Notificaciones:**
- Estado en línea/offline
- Indicador de "escritura"
- Mensajes leídos/no leídos
- Contador de no leídos
- Notificaciones mutables

✅ **Privacidad:**
- Bloqueo en chat
- Verificación de bloqueos
- RLS en todas las tablas

✅ **Características Sociales:**
- Reacciones emoji a mensajes
- Búsqueda de conversaciones
- Última vista del usuario

---

## 🗄️ Tablas de Base de Datos

### 1. `conversations`
```sql
id UUID PRIMARY KEY
participant_1_id UUID (references auth.users)
participant_2_id UUID (references auth.users)
last_message_id BIGINT (references messages)
last_message_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```
Almacena conversaciones entre dos usuarios.

### 2. `messages`
```sql
id BIGSERIAL PRIMARY KEY
conversation_id UUID (references conversations)
sender_id UUID (references auth.users)
content TEXT
media_url TEXT
media_type VARCHAR (image, video, audio, file)
is_edited BOOLEAN
edited_at TIMESTAMP
is_deleted BOOLEAN
deleted_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```
Almacena los mensajes individuales.

### 3. `message_reads`
```sql
id BIGSERIAL PRIMARY KEY
message_id BIGINT (references messages)
user_id UUID (references auth.users)
read_at TIMESTAMP
```
Controla qué mensajes ha leído cada usuario.

### 4. `user_online_status`
```sql
id UUID PRIMARY KEY (references auth.users)
is_online BOOLEAN
last_seen TIMESTAMP
updated_at TIMESTAMP
```
Mantiene el estado en línea de cada usuario.

### 5. `message_reactions`
```sql
id BIGSERIAL PRIMARY KEY
message_id BIGINT (references messages)
user_id UUID (references auth.users)
emoji VARCHAR
created_at TIMESTAMP
```
Almacena reacciones emoji a mensajes.

### 6. `chat_blocks`
```sql
id BIGSERIAL PRIMARY KEY
blocker_id UUID (references auth.users)
blocked_id UUID (references auth.users)
created_at TIMESTAMP
```
Almacena bloqueos entre usuarios en chat.

### 7. `chat_notifications`
```sql
id BIGSERIAL PRIMARY KEY
user_id UUID (references auth.users)
conversation_id UUID (references conversations)
unread_count INT
muted BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```
Controla notificaciones y contador de no leídos por conversación.

---

## 📡 Funciones SQL Disponibles

### Gestión de Conversaciones

```sql
-- Obtener o crear conversación
get_or_create_conversation(p_user_1_id UUID, p_user_2_id UUID) -> UUID

-- Obtener todas las conversaciones del usuario
get_user_conversations(p_user_id UUID) -> TABLE
-- Retorna: conversation_id, other_user_id, other_user_username, other_user_avatar, last_message_content, last_message_at, unread_count, is_online, muted
```

### Gestión de Mensajes

```sql
-- Enviar mensaje
send_message(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_media_url TEXT,
  p_media_type VARCHAR
) -> BIGINT

-- Obtener mensajes de una conversación
get_conversation_messages(
  p_conversation_id UUID,
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) -> TABLE

-- Marcar mensaje como leído
mark_message_as_read(p_message_id BIGINT, p_user_id UUID)

-- Marcar conversación como leída
mark_conversation_as_read(p_conversation_id UUID, p_user_id UUID)

-- Editar mensaje
edit_message(p_message_id BIGINT, p_sender_id UUID, p_new_content TEXT)

-- Eliminar mensaje
delete_message(p_message_id BIGINT, p_sender_id UUID)
```

### Privacidad

```sql
-- Bloquear usuario en chat
block_user_chat(p_blocker_id UUID, p_blocked_id UUID)

-- Desbloquear usuario en chat
unblock_user_chat(p_blocker_id UUID, p_blocked_id UUID)

-- Verificar si está bloqueado (bidireccional)
is_blocked_in_chat(p_user_1_id UUID, p_user_2_id UUID) -> BOOLEAN
```

### Estado y Notificaciones

```sql
-- Actualizar estado en línea
update_online_status(p_user_id UUID, p_is_online BOOLEAN)

-- Obtener total de no leídos
get_total_unread_count(p_user_id UUID) -> INT

-- Mutear/desmutear conversación
toggle_conversation_mute(p_user_id UUID, p_conversation_id UUID)
```

### Reacciones

```sql
-- Agregar reacción emoji
add_message_reaction(p_message_id BIGINT, p_user_id UUID, p_emoji VARCHAR)

-- Eliminar reacción emoji
remove_message_reaction(p_message_id BIGINT, p_user_id UUID, p_emoji VARCHAR)
```

---

## 🎨 Componentes React

### `MessagesPage.jsx`
Página principal de mensajes con lista de conversaciones.

**Features:**
- Lista de todas las conversaciones
- Búsqueda de conversaciones
- Contador de no leídos
- Indicador de estado en línea
- Click para abrir chat

**Props:** Ninguna

**Ejemplo:**
```jsx
import MessagesPage from './pages/MessagesPage';

<Route path="/messages" element={<MessagesPage />} />
```

### `ChatWindow.jsx`
Ventana de chat para conversar con un usuario específico.

**Props:**
- `conversationId: UUID` - ID de la conversación
- `otherUser: { id, username, avatar_url }`
- `onClose: () => void` - Callback para cerrar

**Features:**
- Envío de mensajes
- Recepción en tiempo real
- Eliminación de mensajes
- Marcado de leídos automático
- Indicador de bloqueado
- Adjuntos (UI lista)

**Ejemplo:**
```jsx
import ChatWindow from './components/ChatWindow';

<ChatWindow
  conversationId={convId}
  otherUser={user}
  onClose={() => setOpen(false)}
/>
```

---

## 🔧 Instalación Paso a Paso

### 1. Ejecutar SQL en Supabase

```
1. Ve a: https://app.supabase.com/project/[PROJECT_ID]/sql/new
2. Copia todo: supabase/messaging_system.sql
3. Click "Run"
```

### 2. Agregar componentes a la app

Ya están en:
- `src/components/ChatWindow.jsx`
- `src/pages/MessagesPage.jsx`

### 3. Agregar rutas en App.jsx

```jsx
import MessagesPage from './pages/MessagesPage';
import ChatWindow from './components/ChatWindow';

// En el router:
<Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
```

### 4. Agregar en Navbar

```jsx
<button onClick={() => navigate('/messages')}>
  <MessageCircle className="w-6 h-6" />
  {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
</button>
```

---

## 📊 Flujo de Mensajería

```
1. Usuario A abre /messages
   ↓
2. Se cargan conversaciones vía get_user_conversations()
   ↓
3. Usuario A clica en conversación o usuario B
   ↓
4. Se obtiene o crea conversation vía get_or_create_conversation()
   ↓
5. Se cargan mensajes vía get_conversation_messages()
   ↓
6. Se marca como leído vía mark_conversation_as_read()
   ↓
7. Se suscribe a cambios en tiempo real con .on('postgres_changes')
   ↓
8. Usuario A escribe y envía vía send_message()
   ↓
9. El trigger actualiza last_message_at y notificaciones
   ↓
10. Usuario B recibe en tiempo real vía suscripción
    ↓
11. Usuario B marca como leído vía mark_message_as_read()
```

---

## 🛡️ Seguridad

### RLS Habilitado
- ✅ `conversations` - Solo participantes pueden ver
- ✅ `messages` - Solo participantes pueden ver (excepto bloqueados)
- ✅ `message_reads` - Todos pueden ver para confirmar lectura
- ✅ `user_online_status` - Todos pueden ver estado
- ✅ `chat_blocks` - Solo participantes ven bloqueos
- ✅ `chat_notifications` - Solo el usuario
- ✅ `message_reactions` - Todos pueden ver

### Funciones Seguras
- Todas con `SECURITY DEFINER`
- Todas con `SET search_path = public`
- Verificación de permisos en cada función

### Bloqueos
- Bloqueo bidireccional en chat
- Verificación automática al crear conversación
- No se pueden enviar mensajes a bloqueados

---

## 💡 Ejemplos de Uso

### Enviar un mensaje
```javascript
const messageId = await supabase.rpc('send_message', {
  p_conversation_id: 'conv-uuid',
  p_sender_id: currentUser.id,
  p_content: '¡Hola!',
  p_media_url: null,
  p_media_type: null
});
```

### Obtener conversaciones
```javascript
const { data } = await supabase.rpc('get_user_conversations', {
  p_user_id: currentUser.id
});

// data es un array con:
// - conversation_id
// - other_user_username, other_user_avatar
// - last_message_content, last_message_at
// - unread_count
// - is_online, muted
```

### Marcar como leído
```javascript
await supabase.rpc('mark_conversation_as_read', {
  p_conversation_id: 'conv-uuid',
  p_user_id: currentUser.id
});
```

### Bloquear usuario
```javascript
await supabase.rpc('block_user_chat', {
  p_blocker_id: currentUser.id,
  p_blocked_id: otherUser.id
});
```

### Agregar reacción
```javascript
await supabase.rpc('add_message_reaction', {
  p_message_id: 123,
  p_user_id: currentUser.id,
  p_emoji: '❤️'
});
```

---

## 📝 Checklist de Implementación

- [ ] Ejecutar SQL en Supabase
- [ ] Copiar componentes a `src/`
- [ ] Agregar rutas en `App.jsx`
- [ ] Agregar botón en Navbar
- [ ] Probar envío de mensajes
- [ ] Verificar tiempo real (suscripción)
- [ ] Probar marcado de leídos
- [ ] Probar bloqueos
- [ ] Probar reacciones
- [ ] Probar búsqueda

---

## ⚡ Quick Links

- 🔗 SQL Editor: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/sql/new
- 🔗 Realtime: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/realtime
- 🔗 Database: https://app.supabase.com/project/jyfrjwyxlhfhenubrbpk/editor

---

## 🔄 Actualización de Estado en Línea

Para mantener actualizado el estado en línea, puedes ejecutar esto cuando el usuario entre/salga:

```javascript
// Al abrir la app
await supabase.rpc('update_online_status', {
  p_user_id: currentUser.id,
  p_is_online: true
});

// Al cerrar la app (en useEffect cleanup)
await supabase.rpc('update_online_status', {
  p_user_id: currentUser.id,
  p_is_online: false
});
```

