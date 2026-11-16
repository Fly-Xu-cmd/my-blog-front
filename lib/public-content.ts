import { cache } from 'react';
import { notFound } from 'next/navigation';
import { detail, Resource } from './content';
import { ApiError } from './api';
export const publicContent = cache(async (resource: Resource, key: string) => {
  try {
    return await detail(resource, key);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});
export const serialize = <T>(value: T) => JSON.parse(JSON.stringify(value));
