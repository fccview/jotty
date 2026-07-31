/**
 * In-process only. Jotty runs as a single Node process against a flat-file
 * data dir, so a keyed promise map is enough and costs nothing when uncontended.
 * If Jotty is ever clustered across processes these guards stop protecting and
 * the read-modify-write sites need real file locks instead.
 */

const flights = new Map<string, Promise<unknown>>();
const queues = new Map<string, Promise<unknown>>();

const _shrug = (): undefined => undefined;

export const singleFlight = <T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> => {
  const running = flights.get(key) as Promise<T> | undefined;
  if (running) return running;

  const flight = Promise.resolve()
    .then(task)
    .finally(() => {
      if (flights.get(key) === flight) flights.delete(key);
    });

  flights.set(key, flight);
  return flight;
};

export const runQueued = <T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> => {
  const previous = queues.get(key) || Promise.resolve();
  const result = previous.then(task, task);

  const tail = result.then(_shrug, _shrug).then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });

  queues.set(key, tail);
  return result;
};
