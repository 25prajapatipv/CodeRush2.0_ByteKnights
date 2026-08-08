import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clear existing
  await prisma.receipt.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.agent.deleteMany();

  // Create Agents
  const agent1 = await prisma.agent.create({
    data: {
      name: 'Agent Alpha',
      apiKey: 'sk_agent_alpha_123',
    },
  });

  // Create Budgets
  await prisma.budget.create({
    data: {
      agentId: agent1.id,
      type: 'daily',
      limitAmount: 50.0, // 50 USD per day
    },
  });

  await prisma.budget.create({
    data: {
      agentId: agent1.id,
      type: 'per_request',
      limitAmount: 2.0, // max 2 USD per request
    },
  });

  // Create Providers
  const provider1 = await prisma.provider.create({
    data: {
      name: 'FastOCR',
      apiKey: 'sk_provider_fastocr',
      baseUrl: 'http://localhost:3001/mock-provider/fastocr',
    },
  });

  const provider2 = await prisma.provider.create({
    data: {
      name: 'DeepTranslate',
      apiKey: 'sk_provider_deeptrans',
      baseUrl: 'http://localhost:3001/mock-provider/deeptrans',
    },
  });

  // Create Resources
  await prisma.resource.create({
    data: {
      providerId: provider1.id,
      name: 'Receipt OCR',
      description: 'Extracts line items from receipts (Exact payment)',
      price: 0.05,
      schemaInput: JSON.stringify({ image_url: 'string' }),
      schemaOutput: JSON.stringify({ line_items: 'array', total: 'number' }),
      paymentType: 'exact',
      latency: 200,
      qualityScore: 85.5,
    },
  });

  await prisma.resource.create({
    data: {
      providerId: provider2.id,
      name: 'Context-Aware Translation',
      description: 'Translates text and charges per word (Upto payment)',
      price: 0.01,
      schemaInput: JSON.stringify({ text: 'string', target_lang: 'string', max_words: 'number' }),
      schemaOutput: JSON.stringify({ translated_text: 'string', words_used: 'number' }),
      paymentType: 'upto',
      latency: 500,
      qualityScore: 98.2,
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
