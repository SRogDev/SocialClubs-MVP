# SocialClubs — Marketing Strategy

> Documento vivo. Fecha: 2026-03-03

---

## 1. Visión de Marketing

**Tesis central**: SocialClubs crece porque los creadores traen a su audiencia, y esa audiencia trae a otros creadores. El producto es el canal. El marketing es el producto.

**Posicionamiento**: No somos otra red social. Somos la plataforma donde los creadores de contenido construyen su comunidad propia — con economía, identidad y herramientas que ninguna otra plataforma les da.

---

## 2. Estructura del Equipo (Go-to-Market)

### Cofounder de Marketing/Ventas
La decisión más importante antes que cualquier táctica.

**Perfil ideal**:
- Ha hecho crecer una comunidad de creadores o ha trabajado con ellos directamente.
- Entiende creator economy, no solo marketing tradicional.
- Sabe vender B2C2C: vende al creador, el creador vende a su audiencia.
- Tiene relaciones en el ecosistema de creadores hispano (si el mercado inicial es hispanohablante).
- Ejecuta, no solo estrategiza.

**Cómo encontrarlo**:
- Comunidades de founders: Indie Hackers, Product Hunt, comunidades de builders en X/Twitter.
- Eventos de creator economy: VidCon, eventos de podcasters, meetups de creadores.
- Dentro de tu red: la persona que más entienda de marketing entre tus contactos actuales.

**Equity sugerido**: 5-15% (depende del stage y del perfil). No escatimes — un mal cofounder de marketing es peor que ninguno.

---

## 3. Canales de Adquisición

### 3.1 Cold Outreach Automatizado (n8n)

**Flujo propuesto**:
```
Fuente de leads → Enriquecimiento → Segmentación → Email personalizado → Follow-up

Fuentes:
  - YouTube API: creadores con 5k-500k subs (el sweet spot — suficiente audiencia, no tan grandes que ignoren)
  - Instagram API / Phantombuster: perfiles con alta engagement rate
  - TikTok (manual o scraping): creadores en crecimiento
  - Podcasts: directorios como Listen Notes, Spotify for Podcasters

n8n workflow:
  1. Fetch leads desde fuente (YouTube API key basta)
  2. Filtrar por: suscriptores, engagement rate, nicho relevante
  3. Enriquecer con Apollo.io o Hunter.io (encontrar email)
  4. Clasificar por nicho y tamaño (tier 1: 100k+, tier 2: 10k-100k, tier 3: 1k-10k)
  5. Generar email personalizado con IA (Claude API) usando datos del creador
  6. Enviar con Lemlist / Instantly / Apollo (warm-up incluido)
  7. Follow-up automático a los 3 y 7 días si no hay respuesta
  8. Tracking en Airtable / Notion
```

**Volumen objetivo**: 50-100 emails/día en ramp-up, 200-500/día en estado estable.

**Template de email (adaptar por nicho)**:
```
Asunto: [Nombre], tu comunidad merece más que Instagram

Hola [Nombre],

Vi tu contenido sobre [tema específico] — especialmente [post/vídeo concreto].
Tu audiencia está comprometida de una forma que pocos creadores logran.

El problema: toda esa comunidad está en plataformas que se quedan con el control
(y con el algoritmo). SocialClubs es donde esa audiencia es tuya.

[1 línea de diferenciador clave para su nicho]

¿Te muestro cómo en 10 minutos? Sin demo larga, sin PowerPoint.

[Tu nombre]
P.D. Ahora mismo solo invito a creadores seleccionados — quiero que lo primeros
sean los que realmente entiendan el valor de una comunidad propia.
```

**Métricas objetivo**:
- Open rate: >40% (personalización + asunto fuerte)
- Reply rate: >5%
- Demo booked: >2%

### 3.2 Red Personal (Fase 0 — Hoy)

Los primeros 10 creadores son los más importantes. No necesitan ser grandes. Necesitan ser evangelistas.

- Contacta a los creadores que conoces directamente, sin pitch formal.
- Muéstrales el producto como si fuera una beta privada (porque lo es).
- Pídeles feedback honesto, no que lo usen por obligación.
- Los que lo usen por convicción propia son los que van a hablar de ello.

**Objetivo**: 5-10 creadores activos con clubs reales antes de cualquier campaña de marketing.

### 3.3 Content Marketing (orgánico)

**X/Twitter** (el canal primario para creator economy):
- Publicar el proceso de construcción del producto (build in public).
- Compartir insights sobre creator economy, monetización, comunidad.
- Comentar en posts de creadores grandes sobre sus problemas de comunidad.
- Documentar casos de uso reales de los primeros clubs.

**YouTube / Shorts / TikTok**:
- Formato: "Cómo [creador X] monetizó su comunidad con SocialClubs".
- No solo tutoriales — mostrar resultados reales de creadores reales.
- Antes de tener casos propios: contenido educativo sobre creator economy.

**Podcast appearances**:
- Aparecer en podcasts de marketing digital, creator economy, emprendimiento.
- El ángulo: "cómo construí una plataforma para creadores desde cero".

### 3.4 Contenido Generado con IA

**¿Puedes crear anuncios solo a base de prompts?**

**Sí — con matices.**

El estado actual de la tecnología permite:

| Formato | Herramienta | Calidad actual |
|---------|------------|---------------|
| Imagen estática (ads) | Midjourney, Flux, Adobe Firefly | Alta — suficiente para Meta Ads, LinkedIn |
| Vídeo corto (15-30s) | Sora, Kling, Runway ML | Media-alta — funciona para hooks visuales, B-roll |
| Vídeo con avatar/locutor | HeyGen, Synthesia | Alta — excelente para demos de producto |
| Vídeo con voz real + imágenes | ElevenLabs + Kling/Runway | Alta — el mejor ratio calidad/coste |
| UGC sintético (fake testimonial) | HeyGen personas | Media — funciona pero cuidado con la autenticidad |
| Copy de anuncio | Claude, GPT-4o | Alta — mejor que el promedio humano con buen brief |

**Workflow recomendado para anuncios solos**:
```
1. Brief del anuncio (objetivo, audiencia, CTA) → Claude
2. Claude genera: 5 hooks, 3 variantes de copy, CTA alternatives
3. Imágenes de producto/UI: screenshots reales de SocialClubs (más auténtico que AI)
4. Voz en off: ElevenLabs con voz clonada tuya o voz profesional
5. Vídeo: Kling o Runway para animaciones, HeyGen para talking head
6. Montaje: CapCut (rápido) o DaVinci Resolve (calidad)
7. Testing: Meta Ads con 5-10 variantes, dejar correr 3 días, escalar la ganadora
```

**Limitación honesta**: Lo que la IA no puede hacer (aún) es crear contenido auténtico con creadores reales usando la app. Ese UGC real — un creador feliz hablando de SocialClubs — convierte 3-5x mejor que cualquier anuncio generado. Prioriza conseguir ese contenido de los primeros usuarios.

---

## 4. Product Led Growth (PLG) — La Apuesta Principal

### Por qué PLG es la estrategia correcta

SocialClubs tiene un loop viral natural que pocas plataformas tienen:

```
Creador se une a SocialClubs
  → Crea su Club
  → Invita a su audiencia a unirse al Club
  → Audiencia ve "Únete al Club de [Creador] en SocialClubs"
  → Parte de la audiencia son también creadores
  → Esos creadores quieren su propio Club
  → Loop
```

Este es un **network effect de dos lados** con viralidad embebida en el producto.

### Los 3 motores de PLG

#### Motor 1: FOMO entre creadores
"Mi competidor / colega está en SocialClubs y tiene su propia comunidad monetizada. Si no estoy yo, me quedo atrás."

**Cómo activarlo**:
- Hacer que los Clubs de los primeros creadores sean visibles públicamente.
- Rankings y logros públicos que otros creadores puedan ver.
- Press y casos de estudio visibles (X, LinkedIn, YouTube).

#### Motor 2: El Club como canal de adquisición
Cada vez que un creador promociona su Club en sus redes sociales, está promocionando SocialClubs.

**Cómo maximizarlo**:
- Widget embebible: "Únete a mi Club" para webs externas y newsletters.
- Cards de invitación personalizadas con branding del Club (y branding sutil de SocialClubs).
- Compartir logros del Club en redes sociales desde dentro de la app.
- El link del Club es una landing pública optimizada para conversión.

#### Motor 3: Sistema de Referidos entre Clubs
Cada Club tiene un código/link de referido. Cuando un nuevo creador se une gracias a ese link:
- El Club referidor gana puntos/beneficios.
- El nuevo creador tiene un onboarding personalizado.
- Crea relaciones entre clubs (colaboraciones futuras).

**Mecánica**:
```
Club A refiere a Creador B
  → Creador B crea Club B
  → Club A gana: badge de "Club Fundador", puntos, visibilidad en explore
  → Club B nace con relación con Club A (colaboraciones, cross-promo)
```

---

## 5. Segmentación de Creadores

No todos los creadores son iguales. Segmentar permite personalizar el pitch y el onboarding.

| Tier | Tamaño audiencia | Estrategia | Canal |
|------|-----------------|-----------|-------|
| **Nano** | 1k-10k | Mayor engagement, más receptivos al pitch, early adopters ideales | Cold email, DM personal |
| **Micro** | 10k-100k | Sweet spot — audiencia real + apertura a herramientas nuevas | Cold email, referidos de nano |
| **Macro** | 100k-1M | Necesitan caso de uso probado antes de moverse | Referidos de micro, PR |
| **Mega** | 1M+ | Potencial multiplicador enorme pero proceso de decisión largo | Partnerships estratégicos |

**Nichos prioritarios (orden sugerido)**:
1. Creadores de contenido educativo (cursos, tutoriales)
2. Podcasters con comunidad activa
3. Creadores de fitness / wellness
4. Creadores de gaming / esports
5. Artistas y músicos

---

## 6. Métricas de Marketing

### North Star Metric
**Clubs activos** (un Club con al menos 5 miembros activos en los últimos 30 días).

### Métricas de embudo

| Etapa | Métrica | Objetivo (mes 6) |
|-------|---------|-----------------|
| Awareness | Impresiones orgánicas / mes | 500k |
| Consideración | Visitas a landing | 10k/mes |
| Activación | Creadores que crean un Club | 200 |
| Retención | Clubs activos (30d) | 60% |
| Revenue | Clubs con miembros de pago | 30% de los activos |
| Referidos | % clubs adquiridos por referido | >40% |

---

## 7. Presupuesto Inicial Sugerido

| Canal | Inversión mensual | Prioridad |
|-------|------------------|-----------|
| Cold email tooling (Instantly + Apollo) | €150-300/mes | Alta |
| n8n (self-hosted o cloud) | €50/mes | Alta |
| Meta Ads (testing de creatividades) | €500-1000/mes | Media (post-PMF) |
| HeyGen / ElevenLabs para contenido | €100/mes | Media |
| PR / podcasts | Tiempo, no dinero | Alta |
| Cofounder marketing | Equity, no salario inicial | Crítica |

**Total cash mensual en fase pre-revenue**: €800-1500/mes.

---

## 8. Acciones Inmediatas (próximas 4 semanas)

1. **Semana 1**: Configurar n8n + Apollo para lead gen de nano/micro creadores. Objetivo: 500 leads cualificados.
2. **Semana 1**: Escribir 3 templates de email A/B testeables con Claude.
3. **Semana 2**: Contactar personalmente a los 10 creadores de tu red. Activar 3-5 clubs reales.
4. **Semana 2**: Empezar a publicar en X/Twitter 1 post/día sobre el proceso de construcción.
5. **Semana 3**: Primer batch de cold emails (50/día). Monitorizar open rate y reply rate.
6. **Semana 3**: Grabar primer vídeo de demo con HeyGen o en cámara propia.
7. **Semana 4**: Análisis de resultados. Iterar en templates. Escalar lo que funcione.
8. **Ongoing**: Buscar activamente cofounder de marketing en paralelo a todo lo anterior.

---

## 9. ¿Es esto una estrategia de marketing de élite?

**Veredicto**: Es una buena base — PLG + cold outreach + cofounder de ventas es el playbook correcto para este tipo de producto. Lo que la lleva a élite:

1. **Obsesión con el caso de uso del cliente, no con el producto** — el pitch no es "SocialClubs", es "tu comunidad independiente y monetizada".
2. **Medir el loop, no solo la adquisición** — si un creador que entra no trae miembros en 30 días, el loop está roto. Fixear eso antes de escalar.
3. **Contenido de creadores reales antes que publicidad** — un creador contento hablando de su Club en sus stories vale más que €10k en ads.
4. **Velocidad de onboarding** — el tiempo entre "me registré" y "tengo mi primer miembro de pago" debe ser < 30 minutos. Cada minuto extra reduce la conversión en ~10%.
5. **Comunidad de creadores de SocialClubs** — crear un Club privado de "Creadores SocialClubs" donde los primeros usuarios se ayudan entre sí. La comunidad de usuarios es parte del marketing.

---

*Actualizar con métricas reales y aprendizajes cada mes.*
