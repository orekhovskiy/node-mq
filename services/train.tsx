import { MouseEventHandler, useEffect } from 'react';
import io from 'socket.io-client';
import { Socket } from 'Socket.IO';

const Home = () => {
  let socket: Socket;
  useEffect(() => {
    socketInitializer()
      .then(() => {
        console.log('Socket initialized');
      });
  }, []);

  const socketInitializer = async () => {
    await fetch('/api/socket');
    socket = io() as any;
    socket.on('connect', () => {
      console.log('connected');
    });
    socket.on('metrics', msg => {
      console.log(`Metrics: ${Buffer.from(msg.content)}`);
    });
    socket.on('status', msg => {
      console.log(`Status: ${Buffer.from(msg.content)}`);
    });
    socket.on('epoch', msg => {
      console.log(`Epoch: ${Buffer.from(msg.content)}`);
    });
  };

  const emitCommand = (e: any  ) => {
    if (socket) {
      socket.emit('command', {
        type: e.target.textContent?.toLowerCase()
      })
    }
  }

  return (<div>
    <button onClick={emitCommand}>Start</button>
    <button onClick={emitCommand}>Stop</button>
  </div>);
};

export default Home;
