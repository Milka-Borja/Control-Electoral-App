import { z } from 'zod';

export const votoItemSchema = z.object({
  organizacionId: z.string().uuid('Organización inválida'),
  cantidad: z
    .number()
    .int('Los votos deben ser números enteros')
    .min(0, 'No se permiten votos negativos'),
});

export const actaSchema = z
  .object({
    mesaId: z.string().uuid('Mesa inválida'),
    dignidad: z.enum(['ALCALDIA', 'PREFECTURA']),
    totalSufragantes: z
      .number()
      .int('Debe ser un número entero')
      .min(0, 'No se permiten valores negativos'),
    votosBlancos: z
      .number()
      .int('Debe ser un número entero')
      .min(0, 'No se permiten valores negativos'),
    votosNulos: z
      .number()
      .int('Debe ser un número entero')
      .min(0, 'No se permiten valores negativos'),
    votos: z
      .array(votoItemSchema)
      .min(1, 'Debe ingresar los votos de las organizaciones políticas'),
    fotoUri: z
      .string()
      .trim()
      .min(1, 'Debe capturar una fotografía nítida del acta como evidencia'),
    latitud: z.number().min(-90).max(90),
    longitud: z.number().min(-180).max(180),
    precisionGps: z.number().min(0),
    baseVersion: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    let sumaValidos = 0;

    data.votos.forEach((item, index) => {
      sumaValidos += item.cantidad;
      if (item.cantidad > data.totalSufragantes) {
        ctx.addIssue({
          code: 'custom',
          path: ['votos', index, 'cantidad'],
          message: `Supera el total de sufragantes (${data.totalSufragantes})`,
        });
      }
    });

    if (data.votosBlancos > data.totalSufragantes) {
      ctx.addIssue({
        code: 'custom',
        path: ['votosBlancos'],
        message: 'Los votos en blanco no pueden superar el total de sufragantes',
      });
    }

    if (data.votosNulos > data.totalSufragantes) {
      ctx.addIssue({
        code: 'custom',
        path: ['votosNulos'],
        message: 'Los votos nulos no pueden superar el total de sufragantes',
      });
    }

    const sumaTotal = sumaValidos + data.votosBlancos + data.votosNulos;
    if (sumaTotal !== data.totalSufragantes) {
      const diferencia = sumaTotal - data.totalSufragantes;
      const detalle =
        diferencia > 0
          ? `sobran ${diferencia} votos`
          : `faltan ${Math.abs(diferencia)} votos`;

      ctx.addIssue({
        code: 'custom',
        path: ['totalSufragantes'],
        message: `Inconsistencia matemática: válidos (${sumaValidos}) + blancos (${data.votosBlancos}) + nulos (${data.votosNulos}) = ${sumaTotal}, pero ingresó ${data.totalSufragantes} sufragantes (${detalle}).`,
      });
    }
  });

export type ActaInput = z.infer<typeof actaSchema>;