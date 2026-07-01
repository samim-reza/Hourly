#!/usr/bin/env node
/**
 * Creates demo worker (freelancer) + client accounts in Supabase.
 * Run: npm run seed:users
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const env = {};
  for (const file of ['.env', resolve(root, '.env')]) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim();
      }
    } catch {
      /* skip */
    }
  }
  return env;
}

const USERS = [
  {
    email: 'worker@hourly.samimreza.me',
    password: 'Worker@Hourly2026',
    name: 'Demo Worker',
    role: 'freelancer',
    hourly_rate: 25,
  },
  {
    email: 'client@hourly.samimreza.me',
    password: 'Client@Hourly2026',
    name: 'Demo Client',
    role: 'client',
    hourly_rate: 0,
  },
];

const env = loadEnv();
const url = env.SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(user) {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === user.email);

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role },
    });
    await admin.from('profiles').update({
      name: user.name,
      role: user.role,
      hourly_rate: user.hourly_rate,
    }).eq('id', existing.id);
    console.log(`Updated: ${user.email} (${user.role})`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { name: user.name, role: user.role },
  });

  if (error) {
    console.error(`Failed ${user.email}:`, error.message);
    return null;
  }

  await admin.from('profiles').update({
    name: user.name,
    role: user.role,
    hourly_rate: user.hourly_rate,
  }).eq('id', data.user.id);

  console.log(`Created: ${user.email} (${user.role})`);
  return data.user.id;
}

async function ensureDemoProject(workerId, clientId) {
  const { data: existing } = await admin
    .from('projects')
    .select('id')
    .eq('name', 'Demo Project')
    .eq('freelancer_id', workerId)
    .maybeSingle();

  if (existing) {
    await admin.from('projects').update({ client_id: clientId }).eq('id', existing.id);
    console.log('Linked Demo Project → worker + client');
    return;
  }

  const { error } = await admin.from('projects').insert({
    name: 'Demo Project',
    freelancer_id: workerId,
    client_id: clientId,
  });

  if (error) console.error('Project error:', error.message);
  else console.log('Created Demo Project linking worker + client');
}

console.log('Seeding Hourly demo users...\n');

const workerId = await ensureUser(USERS[0]);
const clientId = await ensureUser(USERS[1]);

if (workerId && clientId) {
  await ensureDemoProject(workerId, clientId);
}

console.log('\n--- Login credentials ---');
console.log('Worker:  worker@hourly.samimreza.me  /  Worker@Hourly2026');
console.log('Client:  client@hourly.samimreza.me  /  Client@Hourly2026');
console.log('(Use desktop app as Worker, dashboard as either role)');
