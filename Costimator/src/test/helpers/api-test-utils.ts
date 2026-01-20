/**
 * Test Utilities for API Route Testing
 * Provides helpers to test Next.js API routes without a server
 */

import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;
  
  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body && method !== 'GET' && method !== 'HEAD') {
    requestInit.body = JSON.stringify(body);
  }
  
  return new NextRequest(url, requestInit);
}

/**
 * Extract JSON from NextResponse
 */
export async function extractJSON(response: Response) {
  return await response.json();
}

/**
 * Helper to test API routes directly
 */
export async function testApiRoute(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  } = {}
) {
  const request = createMockRequest(url, options);
  const context = options.params ? { params: options.params } : undefined;
  const response = await handler(request, context);
  const data = await extractJSON(response);
  
  return {
    status: response.status,
    data,
    response,
  };
}
