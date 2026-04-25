import { prisma } from '../prisma/client';
import { logger } from './logger';

export interface MemoryContext {
  inferredRole?: string;
  inferredStack: string[];
  inferredDomain?: string;
  topTools: string[];
  frameworkAffinities: Record<string, number>;
  writingStyle?: string;
  memoryNotes: string[];
}

export async function getOrCreateMemory(userId: string) {
  return prisma.userMemory.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getMemoryContext(userId: string): Promise<MemoryContext> {
  const memory = await getOrCreateMemory(userId);
  return {
    inferredRole: memory.inferredRole || undefined,
    inferredStack: memory.inferredStack,
    inferredDomain: memory.inferredDomain || undefined,
    topTools: memory.topTools,
    frameworkAffinities: (memory.frameworkAffinities as Record<string, number>) || {},
    writingStyle: memory.writingStyle || undefined,
    memoryNotes: memory.memoryNotes,
  };
}

// Build a personalisation prefix to inject into AI system prompts
export function buildPersonalisationContext(ctx: MemoryContext): string {
  const parts: string[] = [];

  if (ctx.inferredRole) {
    parts.push(`The user is a ${ctx.inferredRole}.`);
  }
  if (ctx.inferredStack.length > 0) {
    parts.push(`Their typical tech stack includes: ${ctx.inferredStack.slice(0, 6).join(', ')}.`);
  }
  if (ctx.inferredDomain) {
    parts.push(`They work in the ${ctx.inferredDomain} domain.`);
  }
  if (ctx.writingStyle) {
    parts.push(`Preferred output style: ${ctx.writingStyle}.`);
  }

  // Top frameworks this user likes
  const topFws = Object.entries(ctx.frameworkAffinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([fw]) => fw);
  if (topFws.length > 0) {
    parts.push(`User often uses these prompt frameworks: ${topFws.join(', ')}.`);
  }

  if (ctx.memoryNotes.length > 0) {
    parts.push(`Additional context: ${ctx.memoryNotes.slice(-3).join(' ')}`);
  }

  if (parts.length === 0) return '';

  return `[USER CONTEXT — use to personalise your response]\n${parts.join('\n')}\n[END USER CONTEXT]\n\n`;
}

// Called after every tool run to learn from usage
export async function recordToolUsage(
  userId: string,
  toolId: string,
  framework?: string,
  provider?: string,
  inputText?: string
): Promise<void> {
  try {
    const memory = await getOrCreateMemory(userId);

    // Update tool frequency
    const freq = (memory.toolFrequency as Record<string, number>) || {};
    freq[toolId] = (freq[toolId] || 0) + 1;

    // Update top tools list
    const topTools = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([t]) => t);

    // Update framework affinity (score 0-1, decays slowly)
    const affinities = (memory.frameworkAffinities as Record<string, number>) || {};
    if (framework) {
      const current = affinities[framework] || 0;
      affinities[framework] = Math.min(1, current + 0.1);
      // Slight decay on others
      for (const key of Object.keys(affinities)) {
        if (key !== framework) {
          affinities[key] = Math.max(0, affinities[key] - 0.01);
        }
      }
    }

    // Update preferred provider
    const provAffinities = (memory.providerAffinities as Record<string, number>) || {};
    if (provider) {
      provAffinities[provider] = (provAffinities[provider] || 0) + 1;
      const topProvider = Object.entries(provAffinities)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      await prisma.userMemory.update({
        where: { userId },
        data: {
          toolFrequency: freq,
          topTools,
          frameworkAffinities: affinities,
          providerAffinities: provAffinities,
          preferredProvider: topProvider,
        },
      });
    } else {
      await prisma.userMemory.update({
        where: { userId },
        data: { toolFrequency: freq, topTools, frameworkAffinities: affinities },
      });
    }

    // Async: extract tech stack signals from input text
    if (inputText) {
      extractAndSaveStackSignals(userId, inputText).catch(() => {});
    }

  } catch (err) {
    logger.error(`Memory update failed: ${(err as Error).message}`);
  }
}

const TECH_SIGNALS: Record<string, string[]> = {
  'React': ['react', 'jsx', 'tsx', 'usestate', 'useeffect', 'next.js', 'nextjs'],
  'Vue': ['vue', 'nuxt'],
  'Angular': ['angular', 'ng-'],
  'TypeScript': ['typescript', '.ts', 'interface ', 'type ', ': string', ': number'],
  'Node.js': ['node.js', 'nodejs', 'express', 'fastify', 'npm', 'require('],
  'Python': ['python', 'def ', 'import ', '.py', 'django', 'flask', 'fastapi'],
  'PostgreSQL': ['postgresql', 'postgres', 'pg.', 'prisma', 'sequelize'],
  'MongoDB': ['mongodb', 'mongoose', '.find(', 'aggregate('],
  'Docker': ['docker', 'dockerfile', 'docker-compose', 'container'],
  'AWS': ['aws', 'lambda', 's3', 'ec2', 'dynamodb'],
  'GraphQL': ['graphql', 'query {', 'mutation {', 'resolver'],
  'Redis': ['redis', 'cache', 'pub/sub'],
};

async function extractAndSaveStackSignals(userId: string, text: string): Promise<void> {
  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const [tech, signals] of Object.entries(TECH_SIGNALS)) {
    if (signals.some(s => lower.includes(s))) {
      detected.push(tech);
    }
  }

  if (!detected.length) return;

  const memory = await prisma.userMemory.findUnique({ where: { userId } });
  if (!memory) return;

  const existing = new Set(memory.inferredStack);
  detected.forEach(t => existing.add(t));
  const updated = Array.from(existing).slice(0, 20);

  await prisma.userMemory.update({
    where: { userId },
    data: { inferredStack: updated },
  });
}

export async function addMemoryNote(userId: string, note: string): Promise<void> {
  const memory = await getOrCreateMemory(userId);
  const notes = [...memory.memoryNotes, note].slice(-20); // keep last 20
  await prisma.userMemory.update({ where: { userId }, data: { memoryNotes: notes } });
}

export async function updateUserContext(
  userId: string,
  updates: { inferredRole?: string; inferredDomain?: string; writingStyle?: string }
): Promise<void> {
  await prisma.userMemory.update({ where: { userId }, data: updates });
}
