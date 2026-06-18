self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Don't intercept API routes, auth routes, or Clerk routes
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/sign-in') || 
      url.pathname.startsWith('/sign-up') ||
      url.hostname.includes('clerk') ||
      url.hostname.includes('supabase')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
