import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{ invite?: string; club?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { invite, club } = await searchParams;

  const title = club ? `Éste es el último paso para unirte a ${club}` : "Gracias por registrarte";
  const description = club
    ? `Revisa tu correo y confirma tu cuenta. Al hacer clic en el enlace quedarás unido automáticamente al club.`
    : "Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {title}
              </CardTitle>
              <CardDescription>Confirma tu email</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
              {invite && (
                <p className="mt-3 text-xs text-muted-foreground">
                  El enlace del email te llevará directamente al club.
                  ¡No cierres esta pestaña hasta confirmar!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
