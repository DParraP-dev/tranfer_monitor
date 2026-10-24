"use client";

import { useActionState, useState } from "react";
import { createClient, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, UserPlus } from "lucide-react";

export function CreateClientForm() {
  const [state, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(createClient, undefined);
  const [copied, setCopied] = useState(false);

  function copyKey() {
    if (state?.apiKey) {
      navigator.clipboard.writeText(state.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Nuevo cliente
        </CardTitle>
        <CardDescription>
          Crea un cliente con su usuario de acceso. Se generará una API Key para
          configurar en Make.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del cliente</Label>
            <Input id="name" name="name" placeholder="Empresa ABC" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo de acceso</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="cliente@empresa.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña inicial</Label>
            <Input
              id="password"
              name="password"
              type="text"
              placeholder="mín. 6 caracteres"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear cliente"}
            </Button>
          </div>
        </form>

        {state && (
          <div
            className={
              state.ok
                ? "rounded-md border border-green-200 bg-green-50 p-4"
                : "rounded-md border border-red-200 bg-red-50 p-4"
            }
          >
            <p
              className={
                state.ok
                  ? "text-sm font-medium text-green-800"
                  : "text-sm font-medium text-red-800"
              }
            >
              {state.message}
            </p>
            {state.apiKey && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline">API Key</Badge>
                <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1 font-mono text-xs">
                  {state.apiKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
