import React, { useRef, useEffect } from "react";

const StarryBackground = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const stars = useRef([]);
  const shootingStars = useRef([]);
  const isPaused = useRef(false);

  // Resize canvas and generate stars
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateStars();
  };

  // Generate static stars
  const generateStars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const starDensity = 0.00010; // slightly fewer stars
    const numStars = Math.floor(canvas.width * canvas.height * starDensity);
    stars.current = Array.from({ length: numStars }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 0.25 + 0.15, // smaller stars
      opacity: Math.random() * 0.5 + 0.5,
      twinkleSpeed: (Math.random() * 0.1 + 0.05), // much slower twinkle
    }));
  };

  // For revolving effect
  const rotationRef = useRef(0);
  const ROTATION_SPEED = 0.002; // radians per frame, slow

  // Create a shooting star
  const createShootingStar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const side = Math.floor(Math.random() * 4);
    let x, y, angle;
    const speed = Math.random() * 7 + 3; // slower: 3 to 10
    let maxDistance = 0;
    switch (side) {
      case 0: // Top
        x = Math.random() * canvas.width;
        y = 0;
        angle = 45;
        // Distance to farthest edge
        maxDistance = Math.sqrt(Math.pow(canvas.width - x, 2) + Math.pow(canvas.height, 2));
        break;
      case 1: // Right
        x = canvas.width;
        y = Math.random() * canvas.height;
        angle = 135;
        maxDistance = Math.sqrt(Math.pow(x, 2) + Math.pow(canvas.height - y, 2));
        break;
      case 2: // Bottom
        x = Math.random() * canvas.width;
        y = canvas.height;
        angle = 225;
        maxDistance = Math.sqrt(Math.pow(canvas.width - x, 2) + Math.pow(y, 2));
        break;
      case 3: // Left
        x = 0;
        y = Math.random() * canvas.height;
        angle = 315;
        maxDistance = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(y, 2));
        break;
      default:
        x = 0;
        y = 0;
        angle = 0;
        maxDistance = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
    }
    shootingStars.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      angle,
      speed,
      distance: 0,
      length: 50,
      maxDistance,
    });
  };

  // Draw stars and shooting stars
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Revolve the star field
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current);
    ctx.translate(-cx, -cy);

    // Draw static stars
    ctx.fillStyle = "white";
    stars.current.forEach((star) => {
      ctx.globalAlpha = star.opacity;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 1;
    shootingStars.current.forEach((star) => {
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      const endX = star.x + Math.cos((star.angle * Math.PI) / 180) * star.length;
      const endY = star.y + Math.sin((star.angle * Math.PI) / 180) * star.length;
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
  };

  // Animate stars and shooting stars
  const animate = () => {
    if (!isPaused.current) {
      // Twinkle static stars
      stars.current.forEach((star) => {
        star.opacity += star.twinkleSpeed * 0.01; // much slower sparkle
        if (star.opacity > 1 || star.opacity < 0.5) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }
      });

      // Slowly revolve the star field
      rotationRef.current += ROTATION_SPEED;

      // Move shooting stars
      shootingStars.current = shootingStars.current.filter(
        (star) => star.distance < (star.maxDistance || 1000)
      );
      shootingStars.current.forEach((star) => {
        star.x += star.speed * Math.cos((star.angle * Math.PI) / 180);
        star.y += star.speed * Math.sin((star.angle * Math.PI) / 180);
        star.distance += star.speed;
      });

      // Randomly create new shooting stars (about 1 every 10 seconds)
      if (Math.random() < 0.0017) { // 0.0017 * 60fps * 10s ≈ 1
        createShootingStar();
      }

      draw();
    }
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    resizeCanvas();
    animate();

    window.addEventListener("resize", resizeCanvas);

    // Shooting star interval (every 10 seconds)
    const interval = setInterval(() => {
      if (!isPaused.current) createShootingStar();
    }, 10000);

    // Pause on hover
    const handleMouseEnter = () => {
      isPaused.current = true;
    };
    const handleMouseLeave = () => {
      isPaused.current = false;
    };

    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
      clearInterval(interval);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="starry-background"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: "#000",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
};

export default StarryBackground; 