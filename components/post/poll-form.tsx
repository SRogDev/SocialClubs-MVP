import React, { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Spinner } from "@/components/ui/spinner";
import useActions from "@/hooks/use-actions";

import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";


type QuestionOptions = {
  value: string;
};

interface PollFormProps {
  question?: string;
  options?: QuestionOptions[];
  need_point?: boolean;
  id?: string;
  action: "add" | "edit";
  closeDialog: () => void;
}

function PollForm({
  closeDialog,
  need_point,
  options,
  question,
  id,
  action,
}: PollFormProps) {
  const form = useForm({
    defaultValues: {
      question: question ? question : "",
      options: options ? options : [{ value: "" }, { value: "" }],
      need_points: need_point ? need_point : false,
    },
  });
  const { addNewPoll, isLoading, editPoll } = useActions();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  function mostrarNotificacion() {
    /*toast("¡Acción realizada con éxito!", {
      icon: <CheckCircle className="text-orange-500" />,
      duration: 3000, // opcional
    });*/
  }

  function onSubmit() {
    const nuevoPoll = {
      question: form.getValues().question,
      options: form.getValues().options.map((option, index) => ({
        id: (index + 1).toString(),
        text: option.value,
        votes: 0,
      })),
      totalVotes: 0,
    };
    if (action == "add") {
      addNewPoll(nuevoPoll);
    } else {
      //@ts-ignore
      editPoll(id, nuevoPoll);
    }
    mostrarNotificacion();
    closeDialog();
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pregunta de la encuesta</FormLabel>
              <FormControl>
                <Input placeholder="Escribe tu pregunta aquí" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="rounded-lg border p-3 shadow-sm">
          <FormLabel>Opciones de respuesta</FormLabel>
          {fields.map((option, idx) => (
            <div key={option.id} className="flex items-center gap-2 mt-2">
              <FormField
                control={form.control}
                name={`options.${idx}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder={`Opción ${idx + 1}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {fields.length > 2 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(idx)}
                  title="Eliminar opción"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            className="mt-2"
            onClick={() => append({ value: "" })}
            disabled={fields.length >= 4}
          >
            Añadir opción
          </Button>
        </div>
        <FormField
          control={form.control}
          name="need_points"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>¿Se necesitan puntos para votar?</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button>
          {isLoading ? (
            <Spinner className="text-white"></Spinner>
          ) : (
            "Crear Encuesta"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default PollForm;
