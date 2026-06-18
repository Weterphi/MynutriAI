import React, { useEffect, useRef } from 'react';

export default function NeuralNetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    const particles = [];
    const maxParticles = Math.min(Math.floor((width * height) / 12000), 100); // Amount scales with screen size
    
    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8, // Slow movement
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1,
      });
    }
    
    let animationId;
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update & Draw particles
      for (let i = 0; i < maxParticles; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges gracefully
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'; // Molto più visibile
        ctx.fill();
        
        // Connect nearby particles
        for (let j = i + 1; j < maxParticles; j++) {
          let p2 = particles[j];
          let dx = p.x - p2.x;
          let dy = p.y - p2.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // Opacity decreases as distance increases
            let opacity = 1 - (dist / 130);
            ctx.strokeStyle = `rgba(16, 185, 129, ${opacity * 0.7})`; // Linee più visibili
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -5,
        pointerEvents: 'none',
        WebkitMaskImage: 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) calc(50vw - 320px), rgba(0,0,0,0) calc(50vw - 250px), rgba(0,0,0,0) calc(50vw + 250px), rgba(0,0,0,1) calc(50vw + 320px), rgba(0,0,0,1) 100%)',
        maskImage: 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) calc(50vw - 320px), rgba(0,0,0,0) calc(50vw - 250px), rgba(0,0,0,0) calc(50vw + 250px), rgba(0,0,0,1) calc(50vw + 320px), rgba(0,0,0,1) 100%)'
      }}
    />
  );
}
