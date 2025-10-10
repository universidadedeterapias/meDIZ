// src/scripts/ensure-admin.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Verificando/criando usuário admin...');

  const prisma = new PrismaClient();
  
  try {
    // Verificar se existe admin com email @mediz.com
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: {
          endsWith: '@mediz.com'
        }
      }
    });

    if (existingAdmin) {
      console.log(`Admin encontrado: ${existingAdmin.email}`);
      
      // Atualizar senha para garantir acesso
      const newPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { 
          passwordHash: hashedPassword,
          emailVerified: new Date() // Garantir que o email está verificado
        }
      });
      
      console.log(`Senha do admin ${existingAdmin.email} foi atualizada para 'Admin123!'`);
      return;
    }

    // Criar novo usuário admin
    const email = 'admin@mediz.com';
    const name = 'Administrador';
    const password = 'Admin123!';
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newAdmin = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        emailVerified: new Date() // Importante para autenticação
      }
    });
    
    console.log(`Novo admin criado: ${newAdmin.email}`);
    console.log('Email: admin@mediz.com');
    console.log('Senha: Admin123!');
    
  } catch (error) {
    console.error('Erro ao criar/verificar admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

