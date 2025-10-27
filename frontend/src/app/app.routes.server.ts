import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Use Server rendering for dynamic routes (avoid prerender params requirements)
    renderMode: RenderMode.Server
  }
];
