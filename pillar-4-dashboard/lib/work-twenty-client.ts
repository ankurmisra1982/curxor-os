import "server-only";

import { loadDigitalEnv } from "./digital-env";

export async function isTwentyConfiguredAsync(): Promise<boolean> {
  const env = await loadDigitalEnv();
  const url = env.TWENTY_API_URL?.trim() || process.env.TWENTY_API_URL?.trim();
  const key = env.TWENTY_API_KEY?.trim() || process.env.TWENTY_API_KEY?.trim();
  return Boolean(url && key);
}

async function twentyGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const env = await loadDigitalEnv();
  const url = (env.TWENTY_API_URL ?? process.env.TWENTY_API_URL)?.trim();
  const key = (env.TWENTY_API_KEY ?? process.env.TWENTY_API_KEY)?.trim();
  if (!url || !key) return null;

  const endpoint = url.endsWith("/graphql") ? url : `${url.replace(/\/$/, "")}/graphql`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { data?: T };
  return json.data ?? null;
}

export interface TwentyPerson {
  id: string;
  name: string;
  email: string;
}

export async function listTwentyPeople(limit = 25): Promise<TwentyPerson[]> {
  const data = await twentyGraphql<{ people: { edges: Array<{ node: { id: string; name: { firstName?: string; lastName?: string }; emails: { primaryEmail?: string } } }> } }>(
    `query ListPeople($limit: Int) {
      people(first: $limit) {
        edges { node { id name { firstName lastName } emails { primaryEmail } } }
      }
    }`,
    { limit },
  );

  if (!data?.people?.edges) return [];

  return data.people.edges.map((e) => {
    const n = e.node;
    const name = [n.name?.firstName, n.name?.lastName].filter(Boolean).join(" ") || "Unknown";
    return { id: n.id, name, email: n.emails?.primaryEmail ?? "" };
  });
}

export async function createTwentyPerson(input: {
  name: string;
  email: string;
}): Promise<TwentyPerson | null> {
  const parts = input.name.trim().split(/\s+/);
  const firstName = parts[0] ?? input.name;
  const lastName = parts.slice(1).join(" ") || "";

  const data = await twentyGraphql<{ createPerson: { id: string; name: { firstName?: string; lastName?: string }; emails: { primaryEmail?: string } } }>(
    `mutation CreatePerson($data: PersonCreateInput!) {
      createPerson(data: $data) {
        id
        name { firstName lastName }
        emails { primaryEmail }
      }
    }`,
    {
      data: {
        name: { firstName, lastName },
        emails: { primaryEmail: input.email },
      },
    },
  );

  if (!data?.createPerson) return null;
  const p = data.createPerson;
  return {
    id: p.id,
    name: [p.name?.firstName, p.name?.lastName].filter(Boolean).join(" ") || input.name,
    email: p.emails?.primaryEmail ?? input.email,
  };
}
