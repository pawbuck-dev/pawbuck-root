type SelectChain = {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
};

export function mockSelectChain(result: { data: unknown; error: Error | null }): SelectChain {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const single = jest.fn().mockResolvedValue(result);
  const order = jest.fn().mockResolvedValue(result);
  const chain: Record<string, jest.Mock> = {};
  const eq = jest.fn(() => chain);
  chain.eq = eq;
  chain.order = order;
  chain.maybeSingle = maybeSingle;
  chain.single = single;
  const select = jest.fn(() => chain);
  chain.select = select;
  return { select, eq, order, maybeSingle, single };
}

export function mockInsertSingle<T>(result: { data: T | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  return { insert, single, select };
}

export function mockUpdateSingle<T>(result: { data: T | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const update = jest.fn().mockReturnValue({ select, eq: jest.fn().mockReturnValue({ select }) });
  return { update, single, select };
}

export type SupabaseMockTables = Record<string, Record<string, jest.Mock>>;

export function createSupabaseMock(options?: {
  getSession?: jest.Mock;
  getUser?: jest.Mock;
  tables?: SupabaseMockTables;
  functionsInvoke?: jest.Mock;
}) {
  const from = jest.fn((table: string) => {
    const tableMocks = options?.tables?.[table];
    if (!tableMocks) {
      throw new Error(`unexpected supabase table ${table}`);
    }
    return tableMocks;
  });

  return {
    supabase: {
      auth: {
        getSession: options?.getSession ?? jest.fn(),
        getUser: options?.getUser ?? jest.fn(),
      },
      from,
      functions: {
        invoke: options?.functionsInvoke ?? jest.fn(),
      },
    },
  };
}
