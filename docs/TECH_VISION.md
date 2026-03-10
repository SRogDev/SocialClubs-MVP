# SocialClubs — Tech Vision

> Documento vivo. Actualizar conforme evolucione el producto y la comunidad dé feedback.
> Fecha: 2026-03-03

---

## 1. Backlog de Features Futuras

Sin orden de prioridad — la comunidad manda.

- **World / Minimundo Virtual** — espacio 3D por Club donde los miembros tienen avatares y pueden interactuar en tiempo real.
- **Vincis** — editor creativo con IA asistida (texto, imagen, vídeo dentro de SocialClubs).
- **Sistema de Bookings** — reservas de servicios, eventos y sesiones entre creadores y fans.
- **Widgets Avanzados** — countdown, spin wheel, magic links, meta embeds, minijuegos.
- **Leaderboard Global** — ranking entre Clubs, no solo dentro de uno.
- **Marketplace de Widgets/Miniapps** — creadores pueden publicar y monetizar sus propias tools.
- **Collaborative Spaces** — salas de co-creación de contenido en tiempo real.
- **Push Notifications Segmentadas** — por nivel de club, intereses, actividad.
- **Social Coin / Economy** — moneda interna del Club con economía propia.
- **Programas de Afiliados entre Clubs** — cross-promotion entre creadores con revenue share.
- **API Pública** — para que creadores construyan integraciones propias.
- **App Nativa (React Native / Expo)** — post-PMF, cuando el canal mobile lo justifique.

---

## 2. Diseño de Arquitectura a Largo Plazo

### 2.1 Estado Actual (monolito pragmático)

```
Next.js 15 (App Router)
  └── Supabase (PostgreSQL + Auth + Realtime)
  └── Upstash Redis + QStash
  └── Vercel (edge/serverless)
  └── Stripe · Mux · ImageKit · PostHog
```

### 2.2 Migración Progresiva a AWS

La migración no es una fecha, es un umbral de carga y ROI. El monolito escala bien hasta ~100k usuarios activos mensuales con Vercel + Supabase. A partir de ahí, cada servicio se extrae cuando su coste o latencia lo justifique.

#### Hoja de ruta AWS

| Fase | Cuándo migrar | Qué se mueve | Por qué |
|------|--------------|--------------|---------|
| 0 — Hoy | — | Vercel + Supabase + Upstash | Velocidad de iteración máxima |
| 1 — Early Growth | ~20k MAU | **S3 + CloudFront** para assets estáticos y vídeo (sustituir ImageKit/Mux en parte) | Coste de CDN + control de egress |
| 2 — Escala | ~80k MAU | **RDS (Aurora PostgreSQL)** reemplaza Supabase DB directa; Supabase Auth se mantiene o migra a Cognito | Particionado, read replicas, control total |
| 3 — Alta Carga | ~200k MAU | **ECS/Fargate o EKS** para el backend Next.js; separar SSR del API | Coste por request vs contenedor siempre activo |
| 4 — Big Data | ~500k MAU | **MSK (Kafka gestionado) + Kinesis** para streams de eventos; S3 Data Lake | Volumen de eventos que QStash ya no absorbe bien |
| 5 — ML en producción | ~1M MAU | **SageMaker + EMR** para pipelines de entrenamiento; **Bedrock** para inferencia | Coste inferencia y control de modelos propios |

### 2.3 Kafka y Event Streaming

Cuando los eventos de gamificación, analíticas y comportamiento de usuario superen ~1M eventos/día:

```
Productores:
  - Post creado / Like / Comment → Kafka topic: user.events
  - Club activity              → Kafka topic: club.events
  - Pagos / Suscripciones      → Kafka topic: billing.events

Consumidores:
  - Gamification Worker        → actualiza puntos, logros
  - Analytics Aggregator       → métricas por club en tiempo real
  - ML Feature Pipeline        → construye datasets para entrenamiento
  - Notification Router        → dispara OneSignal / email según reglas

Kafka → S3 Data Lake (Parquet) → Spark/EMR → Feature Store → SageMaker
```

### 2.4 División en Microservicios

Extraer un microservicio tiene sentido cuando: el dominio tiene SLA distinto, equipo propio, o el coste de mantenerlo en el monolito supera el overhead de la separación.

| Microservicio | Descripción | Estimación de ROI para separar |
|--------------|-------------|-------------------------------|
| **Auth Service** | Gestión de sesiones, JWT, OAuth | Cuando Supabase Auth no sea suficiente o quieras SSO enterprise (~500k usuarios) |
| **Notification Service** | Orquesta push, email, in-app | Cuando el volumen supere 500k notifs/día y necesites retry policies propias |
| **Analytics Service** | Agrega métricas de clubs, posts, usuarios | Cuando las queries analíticas compitan con las operacionales en DB (~200k MAU) |
| **Gamification Service** | Puntos, logros, leaderboards | Cuando la lógica de reglas sea compleja y necesite A/B testing independiente (~300k MAU) |
| **Payments Service** | Stripe, subscriptions, escrow | Cuando añadas wallets, Social Coin o multi-currency real (~100k suscriptores de pago) |
| **World Service** | Minimundo virtual, avatares, física | Desde el día 1 si se construye — es inherentemente stateful y necesita WebSockets persistentes |
| **Content Moderation** | Qval + reglas + CSAM | Cuando el volumen de contenido supere la capacidad de revisión manual (~50k posts/día) |
| **CDN / Media Pipeline** | Procesado de vídeo, imágenes, audio | Al reemplazar Mux/ImageKit con stack propio en S3 + MediaConvert |

---

## 3. Rust en SocialClubs

Rust da ROI donde importa: latencia predecible, cero GC pauses, seguridad de memoria en código crítico.

### 3.1 Analytics Microservice en Rust

**Por qué Rust aquí:** Las analíticas de Clubs requieren agregaciones sobre millones de eventos en tiempo real. Un worker en Rust puede procesar el stream de Kafka, agregar métricas y escribir a Redis/PostgreSQL con latencias P99 < 5ms — imposible con Node.js bajo carga.

```
Kafka → Rust Worker (Axum + Tokio + rdkafka)
  → Agrega: DAU, engagement rate, top posts, revenue per club
  → Escribe: Redis (tiempo real) + TimescaleDB (histórico)
  → Expone: gRPC API para el frontend Next.js
```

Librerías clave: `axum`, `tokio`, `rdkafka`, `sqlx`, `serde`.

### 3.2 World Service en Rust

**Por qué Rust aquí:** El minimundo virtual requiere:
- Estado compartido de miles de usuarios concurrentes en el mismo espacio
- Física ligera (colisiones, posiciones)
- WebSockets de larga duración sin GC pauses
- Serialización/deserialización ultrarrápida de estado del mundo

```
Cliente (WebGL / Three.js en browser)
  ↕ WebSocket (tokio-tungstenite)
Rust World Server (Axum + Tokio)
  → State Machine por Club-World
  → Physics Engine simple (posiciones, zonas)
  → Persistencia de estado en Redis (posiciones activas)
  → Persistencia histórica en PostgreSQL (logros, items)
```

### 3.3 Blockchain Node / Crypto Layer (ver sección 6)

El nodo de la blockchain propia y el runtime de Smart Contracts se implementarán en Rust desde el inicio (ver sección 6).

### 3.4 Otros candidatos a futuro

- **Rate limiter de alta precisión** — si el de Redis no es suficiente, un sidecar en Rust con sliding window atómico.
- **Content hashing / dedup** — detectar imágenes/vídeos duplicados antes de subir a S3.

---

## 4. ML en SocialClubs

### 4.1 Estrategia General

| Técnica | Cuándo usarla |
|---------|--------------|
| **RAG** | Hoy — búsqueda semántica, recomendaciones basadas en contexto |
| **IA Agéntica** | Hoy / próximo — agentes que actúan en nombre del usuario |
| **Fine-tuning** | Cuando tengamos datos propios suficientes (>50k ejemplos etiquetados) |
| **Pretraining** | Largo plazo — si el dominio es suficientemente distinto |

### 4.2 Los Modelos de SocialClubs

#### ClubLM
**Rol:** Cerebro del Club.
- **Fase 1:** Fine-tuned sobre analíticas de clubs — interpreta métricas, detecta anomalías, sugiere acciones al creador ("tu engagement bajó 30% esta semana, aquí hay 3 razones y 3 acciones").
- **Fase 2:** Conciencia del Club — entiende la identidad, valores y voz del club. Actúa como co-piloto del creador para mantener coherencia de comunidad.
- **Base:** LLaMA 3 / Mistral fine-tuned con datos de clubs de la plataforma.
- **Datos de entrenamiento:** métricas de club, posts de alto engagement, feedback de miembros, historial de acciones del creador.

#### Qval — Quality Validator
**Rol:** Depurador de calidad de contenido.
- Evalúa cada post/imagen/vídeo antes de publicarse con una puntuación multidimensional: originalidad, engagement esperado, calidad visual, adecuación al club.
- Si puntúa por debajo del umbral del club (configurable por el creador), rechaza o sugiere mejoras antes de publicar.
- Actúa también como moderador de contenido (spam, NSFW, off-topic).
- **Base:** Vision-Language Model (LLaVA / Qwen-VL) + clasificador de texto.
- **Fine-tuning:** sobre contenido de la plataforma con labels de engagement real (los datos llegan solos con el tiempo).

#### Sdev — Social Developer
**Rol:** Generador de widgets, miniapps y herramientas de SocialClubs.
- Entiende el schema de widgets de SocialClubs, puede generar nuevos widgets funcionales a partir de una descripción en lenguaje natural.
- Ayuda a creadores sin conocimientos técnicos a construir experiencias interactivas en su Club.
- **Base:** Code LLM (DeepSeek-Coder / Codestral) fine-tuned sobre el schema de widgets y ejemplos de miniapps de la plataforma.
- **Pipeline:** Descripción → Sdev → JSON/TSX widget → Validación automática → Preview → Publicar.

#### Nirvana — Context Orchestrator para Vincis
**Rol:** El cerebro detrás del editor creativo Vincis.
- Orquesta contexto para el flujo de creación: entiende el historial del creador, la identidad del club, las tendencias del momento y el objetivo del contenido.
- Estructurado como un grafo de contexto que alimenta a los modelos de generación (imagen, texto, vídeo).
- No genera contenido directamente — estructura y prioriza el contexto para que otros modelos generen mejor.
- **Base:** Modelo de razonamiento pequeño (Phi-3 / Gemma fine-tuned) + RAG sobre contenido del club.
- **Integración:** Nirvana → [DALL-E / Flux / Sora / Kling] para imagen/vídeo; → [Claude / GPT-4o] para texto.

### 4.3 Pipeline de Datos para ML

```
Eventos de usuario (Kafka)
  → Feature Engineering (Spark / Rust worker)
  → Feature Store (S3 + Feast)
  → Fine-tuning jobs (SageMaker / Lambda Labs / RunPod)
  → Model Registry (MLflow)
  → Serving (SageMaker Endpoints / vLLM self-hosted)
  → A/B Testing (PostHog + Experimentation layer)
```

---

## 5. Otras Tecnologías con Potencial

### Zig
- **Build tooling**: Zig como toolchain de compilación para Rust (ya lo hace el ecosistema Rust/Zig).
- **WASM modules ultraligeros**: Si necesitamos lógica de validación/criptografía en el browser sin el overhead de Rust-WASM, Zig produce binarios WASM más pequeños.
- **Candidato futuro**: motor de física para el World Service si Rust resulta demasiado verboso para ese dominio.

### Concurrencia y Distribución
- **Elixir/Phoenix**: Si necesitamos canales de chat con millones de conexiones simultáneas y garantías de fault-tolerance. Phoenix Channels + Presence es difícil de superar para realtime masivo.
- **Go**: Para servicios de infraestructura sencillos (proxies, health checkers, CLI tools) donde la velocidad de desarrollo importa más que el rendimiento extremo.

### Pagos Alternativos
- **Lightning Network (Bitcoin)**: Micropagos instantáneos para propinas entre miembros (< 1 céntimo, imposible con Stripe).
- **Solana Pay / Base (Coinbase L2)**: Si la blockchain propia no está lista y queremos pagos crypto rápidos.
- **Stripe Treasury**: Para wallets embebidas y sending money entre creadores sin salir de la plataforma.

### Vídeo y Streaming
- **LiveKit**: Alternativa open-source a Daily.co/Agora para videollamadas y streaming en tiempo real. Deployable en AWS propio.
- **MediaSoup**: SFU (Selective Forwarding Unit) en Node.js para streaming escalable si queremos control total.
- **FFmpeg (vía Rust binding `ffmpeg-next`)**: Pipeline de transcodificación propio en lugar de Mux, cuando el coste de Mux supere el de self-hosting.
- **WebCodecs API**: Para procesado de vídeo en el browser sin servidor (compresión antes de subir, filtros en tiempo real).

### Imagen y Generación Visual
- **Flux / SDXL self-hosted**: Generación de imágenes para Vincis sin depender de APIs externas de pago.
- **ComfyUI workflows**: Pipelines de imagen reproducibles y versionables.
- **Sharp (Node.js)**: Para procesado de imágenes en el servidor (ya disponible, usar antes que ImageKit para transformaciones simples).

---

## 6. Blockchain en SocialClubs

### 6.1 Visión

SocialClubs no necesita blockchain para sus primeros años. Pero existe un futuro donde la economía de los Clubs (Social Coin, ownership de contenido, revenue sharing automático) se beneficia enormemente de contratos inteligentes y propiedad verificable.

**Principio guía**: Blockchain como capa de liquidación y propiedad — no como UX principal. El usuario nunca debería saber que hay una blockchain detrás.

### 6.2 Plan Progresivo

#### Fase 0 — Sin Blockchain (Hoy → ~2M de transacciones/mes)
- Social Coin como sistema de puntos centralizado en PostgreSQL.
- Pagos con Stripe.
- Ownership de contenido implícito (confía en nosotros).

#### Fase 1 — Blockchain Pública como Capa de Settlement (~500k usuarios)
Usar una L2 existente para no reinventar la rueda:
- **Base (Coinbase L2)** o **Polygon zkEVM**: bajo gas, ecosistema grande, compatible con EVM.
- **Qué ponemos on-chain**: NFTs de membresía de Club (el token = acceso al Club), revenue sharing automático entre creador y colaboradores.
- **Qué queda off-chain**: toda la UX, el contenido, la gamificación.
- **Wallet abstraction**: Privy.io o Dynamic.xyz para que el usuario no sepa que tiene una wallet.

#### Fase 2 — Smart Contracts Propios en Rust (~1M usuarios)
Cuando el volumen de transacciones de Social Coin justifique contratos propios:
- **Plataforma**: Solana (programa en Rust nativo) o Near Protocol (también Rust).
  - Solana: throughput altísimo, bajo coste, ecosistema DeFi.
  - Near: sharding nativo, developer-friendly.
- **Contratos**:
  - `SocialCoin`: SPL Token (Solana) con minting controlado por SocialClubs.
  - `ClubMembership`: NFT de acceso con lógica de expiración y niveles.
  - `RevenueShare`: Distribución automática de suscripciones entre creador, colaboradores y treasury.
  - `ContentOwnership`: Hash del contenido on-chain como proof of creation.

#### Fase 3 — Appchain / Rollup Propio (~5M usuarios)
Si el volumen de transacciones hace que incluso Solana sea caro o limitado:
- **Substrate (Polkadot)** en Rust: costruir una parachain dedicada a SocialClubs Economy.
- **OP Stack o ZK Stack**: Rollup de Ethereum específico para SocialClubs, con Rust para el prover si se elige ZK.
- **Por qué Rust**: Los runtimes de Substrate, los programas de Solana y los provers de ZK se escriben en Rust. Invertir en Rust ahora (Analytics, World Service) construye el equipo que luego hace la blockchain.

### 6.3 Stack Blockchain en Rust

```
Capa de Contrato (Solana)
  → Anchor framework (Rust)
  → Programa: SocialCoin, ClubMembership, RevenueShare

Capa de Indexación
  → The Graph Protocol (subgraph) — indexa eventos on-chain
  → O indexador propio en Rust (sqlx + tokio) para control total

Capa de Abstracción (Next.js)
  → Privy.io SDK — wallet embedded sin fricción
  → Conexión RPC: Helius (Solana RPC premium)
  → Server Actions wrappean las instrucciones de Solana

Capa de Bridge (futuro)
  → Wormhole para mover Social Coin entre chains
```

---

## 7. Principios de Escalabilidad

1. **Monolito hasta que duela** — no microservicios prematuros. El dolor es la señal.
2. **Eventos como contrato** — toda acción significativa emite un evento. Hoy QStash, mañana Kafka.
3. **Cache en capas** — browser → CDN → Redis → DB. Nunca toques la DB sin pasar por cache para lecturas frecuentes.
4. **Rust para el percentil 99** — Node.js para el flujo feliz, Rust cuando el P99 de latencia es inaceptable.
5. **ML sobre datos propios** — no fine-tunear hasta tener 50k ejemplos de calidad. Antes, RAG.
6. **Blockchain como capa de confianza, no de UX** — el usuario no debería saber que existe.
7. **Open source estratégico** — considerar open-sourcear partes no diferenciadas (widgets SDK, Sdev schema) para construir ecosistema.

---

*Actualizar este documento con cada decisión arquitectónica significativa.*
