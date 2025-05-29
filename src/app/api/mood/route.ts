import { NextRequest } from 'next/server';
import { Server } from 'socket.io';
import { createServer } from 'http';

const ioHandler = (req: NextRequest, { params }: { params: any }) => {
  if (!(req as any).socket?.server?.io) {
    console.log('Initializing Socket.IO server...');
    const httpServer = createServer();
    const io = new Server(httpServer, {
      path: '/api/mood',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected to proxy');
      
      const backendSocket = require('socket.io-client')('http://kgh1113.ddns.net:80/api/mood');
      
      socket.on('frame', (payload, callback) => {
        backendSocket.emit('frame', payload, (error: any, processed: any) => {
          if (callback) callback(error, processed);
        });
      });

      socket.on('disconnect', () => {
        backendSocket.disconnect();
      });
    });

    (req as any).socket.server.io = io;
  }
  
  return new Response('Socket.IO server running', { status: 200 });
};

export { ioHandler as GET, ioHandler as POST };