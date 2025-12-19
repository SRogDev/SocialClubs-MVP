import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Content Security Policy (CSP) y seguridad
 * Protege contra inyección de código malicioso (XSS, clickjacking, etc.)
 */
function setSecurityHeaders(response: NextResponse): NextResponse {
  // Nonce para inline scripts (si los necesitamos en el futuro)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https: http:;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' 
      https://*.supabase.co 
      wss://*.supabase.co 
      https://vercel.live 
      https://api.stripe.com;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Aplicar headers de seguridad
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Guardar nonce para uso en el documento (si se necesita)
  response.headers.set("x-nonce", nonce);

  return response;
}

export async function proxy(request: NextRequest) {
  let response = await updateSession(request);

  // Verificaciones de admin y acceso a clubs
  const pathname = request.nextUrl.pathname;

  // Si es ruta de admin, verificar permisos
  if (pathname.startsWith('/admin')) {
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }

    // Verificar si es admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/home-clubs';
      return NextResponse.redirect(url);
    }
  }

  // Si es ruta de club específico, verificar si está banned
  const clubMatch = pathname.match(/^\/clubs\/([^\/]+)$/);
  if (clubMatch && clubMatch[1] !== '[id]') {
    const clubId = clubMatch[1];

    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Obtener información del club y del usuario
      const { data: club } = await supabase
        .from('clubs')
        .select('status, creator')
        .eq('id', clubId)
        .single();

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      // Si el club está banned y el usuario es el creator (no admin), redirect a banned page
      if (club?.status === 'banned' && club.creator === user.id && userData?.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = `/clubs/${clubId}/banned`;
        return NextResponse.redirect(url);
      }
    }
  }

  return setSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
