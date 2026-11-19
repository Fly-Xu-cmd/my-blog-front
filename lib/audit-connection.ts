/** Bound connection setup, snapshot initialization, scanning and shutdown. */
export async function withAuditConnection<
  C extends { destroy(): void; end(): Promise<void> },
  T,
>(
  connect: () => Promise<C>,
  read: (connection: C) => Promise<T>,
  milliseconds = 180000,
): Promise<T> {
  let connection: C | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      connection?.destroy();
      reject(new Error("Audit time limit"));
    }, milliseconds);
  });
  try {
    return await Promise.race([
      deadline,
      (async () => {
        connection = await connect();
        if (expired) {
          connection.destroy();
          throw new Error("Audit time limit");
        }
        const result = await read(connection);
        await connection.end();
        if (expired) throw new Error("Audit time limit");
        return result;
      })(),
    ]);
  } catch (error) {
    connection?.destroy();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
