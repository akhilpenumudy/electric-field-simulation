import React, { useState, useEffect, useRef } from "react";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const CHARGE_RADIUS = 10;
const COULOMB_CONSTANT = 8.99e9;
const CHARGE_VALUE = 1e-9; // 1 nC

const ElectricFieldSimulation = () => {
  const canvasRef = useRef(null);
  const [charges, setCharges] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedChargeIndex, setDraggedChargeIndex] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const drawCharge = (x, y, isPositive) => {
      ctx.beginPath();
      ctx.arc(x, y, CHARGE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = isPositive ? "red" : "blue";
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.stroke();
    };

    const calculateElectricField = (x, y) => {
      let Ex = 0,
        Ey = 0;
      charges.forEach((charge) => {
        const dx = x - charge.x;
        const dy = y - charge.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > CHARGE_RADIUS) {
          const magnitude = (COULOMB_CONSTANT * CHARGE_VALUE) / (r * r);
          Ex += ((magnitude * dx) / r) * (charge.isPositive ? 1 : -1);
          Ey += ((magnitude * dy) / r) * (charge.isPositive ? 1 : -1);
        }
      });
      return [Ex, Ey];
    };

    const traceFieldLine = (startX, startY, isPositive) => {
      const points = [];
      let x = startX,
        y = startY;
      const stepSize = 2;
      const maxSteps = 500;

      for (let i = 0; i < maxSteps; i++) {
        points.push([x, y]);
        const [Ex, Ey] = calculateElectricField(x, y);
        const magnitude = Math.sqrt(Ex * Ex + Ey * Ey);
        if (magnitude === 0) break;

        const dx = (Ex / magnitude) * stepSize * (isPositive ? 1 : -1);
        const dy = (Ey / magnitude) * stepSize * (isPositive ? 1 : -1);

        x += dx;
        y += dy;

        if (x < 0 || x > CANVAS_WIDTH || y < 0 || y > CANVAS_HEIGHT) break;

        // Check if the line is near a charge
        const nearCharge = charges.some(
          (charge) =>
            Math.sqrt((charge.x - x) ** 2 + (charge.y - y) ** 2) < CHARGE_RADIUS
        );
        if (nearCharge) break;
      }

      return points;
    };

    const drawArrow = (fromX, fromY, toX, toY) => {
      const headlen = 10; // length of head in pixels
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.lineTo(
        toX - headlen * Math.cos(angle - Math.PI / 6),
        toY - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headlen * Math.cos(angle + Math.PI / 6),
        toY - headlen * Math.sin(angle + Math.PI / 6)
      );
    };

    const drawFieldLines = () => {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;

      charges.forEach((charge) => {
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * 2 * Math.PI;
          const startX = charge.x + Math.cos(angle) * (CHARGE_RADIUS + 1);
          const startY = charge.y + Math.sin(angle) * (CHARGE_RADIUS + 1);
          const points = traceFieldLine(startX, startY, charge.isPositive);

          ctx.beginPath();
          for (let j = 0; j < points.length - 1; j++) {
            const [x1, y1] = points[j];
            const [x2, y2] = points[j + 1];
            if (j % 10 === 0) {
              // Draw an arrow every 10 points
              drawArrow(x1, y1, x2, y2);
            } else {
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            }
          }
          ctx.stroke();
        }
      });
    };

    const calculatePotential = (x, y) => {
      let potential = 0;
      charges.forEach((charge) => {
        const dx = x - charge.x;
        const dy = y - charge.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > CHARGE_RADIUS) {
          potential +=
            ((COULOMB_CONSTANT * CHARGE_VALUE) / r) *
            (charge.isPositive ? 1 : -1);
        }
      });
      return potential;
    };

    const drawPotentialMap = () => {
      const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
      let max = 0;
      const potentials = [];

      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const potential = Math.abs(calculatePotential(x, y));
          potentials.push(potential);
          max = Math.max(max, potential);
        }
      }

      let i = 0;
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          const potential = potentials[i++];
          const intensity = Math.min(255, Math.floor((potential / max) * 255));
          const index = (y * CANVAS_WIDTH + x) * 4;
          imageData.data[index] = intensity;
          imageData.data[index + 1] = 0;
          imageData.data[index + 2] = 255 - intensity;
          imageData.data[index + 3] = 64; // Set alpha to 64 for more transparency
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawPotentialMap();
      drawFieldLines();
      charges.forEach((charge) =>
        drawCharge(charge.x, charge.y, charge.isPositive)
      );
    };

    render();
  }, [charges]);

  const handleCanvasClick = (e) => {
    if (!isDragging) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const isPositive = e.metaKey || e.ctrlKey; // Check for both Command (Mac) and Ctrl (Windows)
      setCharges([...charges, { x, y, isPositive }]);
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickedChargeIndex = charges.findIndex(
      (charge) =>
        Math.sqrt((charge.x - x) ** 2 + (charge.y - y) ** 2) < CHARGE_RADIUS
    );
    if (clickedChargeIndex !== -1) {
      setIsDragging(true);
      setDraggedChargeIndex(clickedChargeIndex);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && draggedChargeIndex !== null) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCharges(
        charges.map((charge, index) =>
          index === draggedChargeIndex ? { ...charge, x, y } : charge
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedChargeIndex(null);
  };

  return (
    <div>
      <h1
        style={{
          textAlign: "center",
        }}
      >
        Electric Field Simulation
      </h1>
      <p
        style={{
          textAlign: "center",
        }}
      >
        Akhil Penumudy
      </p>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: "1px solid black",
          marginLeft: 420,
          marginRight: 420,
          marginTop: 20,
        }}
      />
      <p
        style={{
          textAlign: "center",
        }}
      >
        Click to add a negative charge. Ctrl+Click or ⌘+Click to add a positive
        charge. Drag charges to move them.
      </p>
      <p
        style={{
          textAlign: "center",
        }}
      >
        🔵 Negitive charge 🔴 Positive charge
      </p>
    </div>
  );
};

export default ElectricFieldSimulation;
