const { PrismaClient } = require('@prisma/client');

// Esta es la implementación recomendada para asegurar una única instancia de PrismaClient.
// En desarrollo, la recarga en caliente puede crear múltiples instancias, agotando las conexiones.
// Almacenar el cliente en el objeto `global` evita este problema.

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

module.exports = prisma;
