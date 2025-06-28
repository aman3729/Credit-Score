import http from 'http';

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request received:', req.url);
  
  // Log request details
  console.log(`\n=== New Request: ${req.method} ${req.url} ===`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Set CORS headers
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5177',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5177'
  ];
  
  const origin = req.headers.origin;
  console.log('Request Origin:', origin);
  
  if (allowedOrigins.includes(origin)) {
    console.log('Origin allowed');
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    console.log('Origin not allowed:', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Request-Method', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Authorization, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.writeHead(204, {
      'Content-Length': '0',
      'Access-Control-Max-Age': '86400' // 24 hours
    });
    res.end();
    return;
  }
  


  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Server is running' }));
    return;
  }

  // Mock auth endpoints
  if (req.url === '/api/auth/me') {
    // Check for Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'No token provided' }));
      return;
    }
    
    // In a real app, you would verify the token here
    // For testing, we'll just return a mock user
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: new Date().toISOString()
    }));
    return;
  }
  
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    // Parse request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        console.log('Login attempt:', { email });
        
        // In a real app, you would validate credentials here
        // For testing, accept any non-empty email and password
        if (email && password) {
          const mockUser = {
            id: 'test-user-123',
            email,
            name: email.split('@')[0],
            role: 'user',
            createdAt: new Date().toISOString()
          };
          
          // In a real app, you would generate a real JWT token
          const mockToken = 'mock-jwt-token-' + Date.now();
          
          // Set HTTP-only cookie
          res.setHeader('Set-Cookie', [
            `token=${mockToken}; HttpOnly; Path=/; SameSite=None; Secure`,
            `user=${encodeURIComponent(JSON.stringify(mockUser))}; Path=/; SameSite=None; Secure`
          ]);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            token: mockToken,
            user: mockUser
          }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Email and password are required' }));
        }
      } catch (error) {
        console.error('Login error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Invalid request' }));
      }
    });
    
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3001; // Changed from 3000 to 3001 to avoid conflicts
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', error);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server has been terminated');
    process.exit(0);
  });
});
