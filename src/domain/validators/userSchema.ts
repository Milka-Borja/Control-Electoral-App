import { z } from 'zod';
import { validarCedulaEcuatoriana } from './cedulaEcuador';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingrese su correo electrónico')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const recoverySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingrese su correo electrónico')
    .email('Correo electrónico inválido'),
});

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
      .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string().min(1, 'Confirme su nueva contraseña'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden',
      });
    }
  });

export const createUserSchema = z.object({
  cedula: z
    .string()
    .trim()
    .length(10, 'La cédula debe tener exactamente 10 dígitos')
    .regex(/^[0-9]{10}$/, 'La cédula solo debe contener números')
    .refine(
      validarCedulaEcuatoriana,
      'Cédula ecuatoriana inválida (dígito verificador incorrecto)'
    ),
  nombres: z
    .string()
    .trim()
    .min(2, 'Ingrese los nombres completos')
    .max(80, 'Máximo 80 caracteres'),
  apellidos: z
    .string()
    .trim()
    .min(2, 'Ingrese los apellidos completos')
    .max(80, 'Máximo 80 caracteres'),
  telefono: z
    .string()
    .trim()
    .regex(
      /^09[0-9]{8}$/,
      'Ingrese un celular ecuatoriano válido de 10 dígitos (ej. 0991234567)'
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Ingrese un correo electrónico válido'),
  rol: z.enum(['RECINTO', 'VEEDOR']),
  esExterno: z.boolean().optional().default(false),
  recintoId: z.string().uuid().optional().nullable(),
  mesaIds: z.array(z.string().uuid()).optional(),
});

export const createRecintoSchema = z.object({
  parroquia: z.string().trim().min(2, 'Ingrese la parroquia'),
  nombre: z.string().trim().min(3, 'Ingrese el nombre del recinto electoral'),
  latitud: z.number().min(-5, 'Latitud fuera de Ecuador').max(2, 'Latitud fuera de Ecuador'),
  longitud: z.number().min(-92, 'Longitud fuera de Ecuador').max(-75, 'Longitud fuera de Ecuador'),
  cantidadMesas: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Debe registrar al menos 1 mesa')
    .max(50, 'Máximo 50 mesas por creación'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RecoveryInput = z.infer<typeof recoverySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateRecintoInput = z.infer<typeof createRecintoSchema>;